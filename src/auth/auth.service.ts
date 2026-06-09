import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID } from 'crypto';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { DbService } from '../db/db.service';

const NONCE_TTL_MS = 10 * 60 * 1000; // 10分
const FAUCET_USDC = 500; // 新規ユーザーの初期USDC（プロト用フォーセット）

/**
 * Sign-In with Solana（本実装）。
 * 1) /auth/nonce で nonce を発行し、署名対象メッセージを返す。
 * 2) ウォレットの秘密鍵でメッセージに ed25519 署名 → /auth/verify。
 * 3) tweetnacl で署名検証。成功時のみ user を upsert し JWT を発行。
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService, private readonly db: DbService) {}

  private message(wallet: string, nonce: string) {
    return `Catcheez にサインインします。\nウォレット: ${wallet}\nNonce: ${nonce}`;
  }

  issueNonce(wallet: string) {
    if (!wallet) throw new BadRequestException('wallet は必須');
    const nonce = randomBytes(16).toString('hex');
    this.db.run(`INSERT OR REPLACE INTO auth_nonce(wallet, nonce, issued_at) VALUES(?,?,?)`,
      [wallet, nonce, Date.now()]);
    this.db.save();
    return { wallet, nonce, message: this.message(wallet, nonce) };
  }

  verify(wallet: string, signature: string, nonce: string) {
    if (!wallet || !signature || !nonce) throw new BadRequestException('wallet / signature / nonce は必須');

    const rec = this.db.get(`SELECT nonce, issued_at FROM auth_nonce WHERE wallet=?`, [wallet]);
    if (!rec) throw new UnauthorizedException('nonce が未発行です');
    if (rec.nonce !== nonce) throw new UnauthorizedException('nonce が一致しません');
    if (Date.now() - rec.issued_at > NONCE_TTL_MS) {
      this.db.run(`DELETE FROM auth_nonce WHERE wallet=?`, [wallet]);
      this.db.save();
      throw new UnauthorizedException('nonce の有効期限切れです');
    }

    // ed25519 署名検証
    let pubkey: Uint8Array, sig: Uint8Array;
    try {
      pubkey = bs58.decode(wallet);
      sig = bs58.decode(signature);
    } catch {
      throw new BadRequestException('wallet / signature は base58 で指定してください');
    }
    if (pubkey.length !== 32) throw new BadRequestException('wallet の公開鍵長が不正です');
    const msg = new TextEncoder().encode(this.message(wallet, nonce));
    const ok = nacl.sign.detached.verify(msg, sig, pubkey);
    if (!ok) throw new UnauthorizedException('署名の検証に失敗しました');

    // nonce 使い捨て
    this.db.run(`DELETE FROM auth_nonce WHERE wallet=?`, [wallet]);

    // user upsert（新規なら faucet ウォレットを付与）
    let user = this.db.get(`SELECT id, wallet, handle FROM app_user WHERE wallet=?`, [wallet]);
    if (!user) {
      const id = 'u_' + randomUUID();
      const handle = wallet.slice(0, 4) + '…' + wallet.slice(-4);
      this.db.run(`INSERT INTO app_user(id, wallet, handle, created_at) VALUES(?,?,?,?)`,
        [id, wallet, handle, new Date().toISOString()]);
      this.db.run(`INSERT OR REPLACE INTO wallet(user_id, usdc, cheez) VALUES(?,?,?)`, [id, FAUCET_USDC, 0]);
      user = { id, wallet, handle };
    }
    this.db.save();

    const token = this.jwt.sign({ sub: user.id, wallet: user.wallet, handle: user.handle });
    return { token, user };
  }
}
