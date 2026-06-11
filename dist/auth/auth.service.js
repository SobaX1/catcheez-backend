"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const nacl = __importStar(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
const db_service_1 = require("../db/db.service");
const NONCE_TTL_MS = 10 * 60 * 1000; // 10分
const FAUCET_USDC = 500; // 新規ユーザーの初期USDC（プロト用フォーセット）
/**
 * Sign-In with Solana（本実装）。
 * 1) /auth/nonce で nonce を発行し、署名対象メッセージを返す。
 * 2) ウォレットの秘密鍵でメッセージに ed25519 署名 → /auth/verify。
 * 3) tweetnacl で署名検証。成功時のみ user を upsert し JWT を発行。
 */
let AuthService = class AuthService {
    constructor(jwt, db) {
        this.jwt = jwt;
        this.db = db;
    }
    message(wallet, nonce) {
        return `Catcheez にサインインします。\nウォレット: ${wallet}\nNonce: ${nonce}`;
    }
    issueNonce(wallet) {
        if (!wallet)
            throw new common_1.BadRequestException('wallet は必須');
        const nonce = (0, crypto_1.randomBytes)(16).toString('hex');
        this.db.run(`INSERT OR REPLACE INTO auth_nonce(wallet, nonce, issued_at) VALUES(?,?,?)`, [wallet, nonce, Date.now()]);
        this.db.save();
        return { wallet, nonce, message: this.message(wallet, nonce) };
    }
    verify(wallet, signature, nonce) {
        if (!wallet || !signature || !nonce)
            throw new common_1.BadRequestException('wallet / signature / nonce は必須');
        const rec = this.db.get(`SELECT nonce, issued_at FROM auth_nonce WHERE wallet=?`, [wallet]);
        if (!rec)
            throw new common_1.UnauthorizedException('nonce が未発行です');
        if (rec.nonce !== nonce)
            throw new common_1.UnauthorizedException('nonce が一致しません');
        if (Date.now() - rec.issued_at > NONCE_TTL_MS) {
            this.db.run(`DELETE FROM auth_nonce WHERE wallet=?`, [wallet]);
            this.db.save();
            throw new common_1.UnauthorizedException('nonce の有効期限切れです');
        }
        // ed25519 署名検証
        let pubkey, sig;
        try {
            pubkey = bs58_1.default.decode(wallet);
            sig = bs58_1.default.decode(signature);
        }
        catch {
            throw new common_1.BadRequestException('wallet / signature は base58 で指定してください');
        }
        if (pubkey.length !== 32)
            throw new common_1.BadRequestException('wallet の公開鍵長が不正です');
        const msg = new TextEncoder().encode(this.message(wallet, nonce));
        const ok = nacl.sign.detached.verify(msg, sig, pubkey);
        if (!ok)
            throw new common_1.UnauthorizedException('署名の検証に失敗しました');
        // nonce 使い捨て
        this.db.run(`DELETE FROM auth_nonce WHERE wallet=?`, [wallet]);
        // user upsert（新規なら faucet ウォレットを付与）
        let user = this.db.get(`SELECT id, wallet, handle FROM app_user WHERE wallet=?`, [wallet]);
        if (!user) {
            const id = 'u_' + (0, crypto_1.randomUUID)();
            const handle = wallet.slice(0, 4) + '…' + wallet.slice(-4);
            this.db.run(`INSERT INTO app_user(id, wallet, handle, created_at) VALUES(?,?,?,?)`, [id, wallet, handle, new Date().toISOString()]);
            this.db.run(`INSERT OR REPLACE INTO wallet(user_id, usdc, cheez) VALUES(?,?,?)`, [id, FAUCET_USDC, 0]);
            user = { id, wallet, handle };
        }
        this.db.save();
        const token = this.jwt.sign({ sub: user.id, wallet: user.wallet, handle: user.handle });
        return { token, user };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, db_service_1.DbService])
], AuthService);
//# sourceMappingURL=auth.service.js.map