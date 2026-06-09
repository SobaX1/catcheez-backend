import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { applyEvent } from './event-apply';

const EVENTS = ['FundInitialized', 'TicketBought', 'Settled', 'Drawn', 'WinnersRootPosted', 'Claimed'];

/**
 * オンチェーンイベントの indexer。
 * - SOLANA_RPC + PROGRAM_ID + CATCHEEZ_IDL が揃えば Anchor で購読し DB を同期。
 * - 未設定 or @coral-xyz/anchor 未導入なら idle（ログのみ）。
 * - apply() はチェーン非依存の純粋ロジック（admin/テストから直接投入可能）。
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly log = new Logger('Indexer');
  private listeners: number[] = [];

  constructor(private readonly db: DbService) {}

  apply(name: string, data: any) {
    const r = applyEvent(this.db, name, data);
    this.db.save();
    return r;
  }

  async onModuleInit() {
    const rpc = process.env.SOLANA_RPC;
    const programId = process.env.PROGRAM_ID;
    const idlPath = process.env.CATCHEEZ_IDL;
    if (!rpc || !programId || !idlPath) {
      this.log.log('indexer disabled (set SOLANA_RPC, PROGRAM_ID, CATCHEEZ_IDL to enable)');
      return;
    }
    try {
      // 動的 require: 未導入でもビルド/起動を妨げない（有効化時のみ必要）
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const anchor: any = require('@coral-xyz/anchor');
      const fs = require('fs');
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      const connection = new anchor.web3.Connection(rpc, 'confirmed');
      const provider = new anchor.AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
      // Anchor 0.30.1 は (idl, provider)。古い版は (idl, programId, provider)。両対応。
      let program: any;
      try { program = new anchor.Program(idl, provider); }
      catch (e) { program = new anchor.Program(idl, programId, provider); }

      // ファンドは indexer 起動前に初期化済みのため、PDA を導出して onchain_addr を補完し、
      // 現在の調達額をチェーンから読み込んでメーターを実態に合わせる（live イベント前のバックフィル）。
      await this.syncFundsFromChain(anchor, connection, programId);

      for (const ev of EVENTS) {
        const id = program.addEventListener(ev, (data: any) => {
          try {
            const r = this.apply(ev, normalize(data));
            this.log.log(`event ${ev}: ${r.effect}`);
          } catch (e) {
            this.log.error(`apply ${ev} failed: ${(e as Error).message}`);
          }
        });
        this.listeners.push(id);
      }
      this.log.log(`indexer subscribed to ${programId} via ${rpc}`);
    } catch (e) {
      this.log.warn('indexer enable failed (install @coral-xyz/anchor?): ' + (e as Error).message);
    }
  }

  /** 各 fund 行の PDA を導出して onchain_addr を補完し、現在の raised をチェーンから読んで反映。 */
  private async syncFundsFromChain(anchor: any, connection: any, programId: string) {
    try {
      const pk = new anchor.web3.PublicKey(programId);
      const funds = this.db.all(`SELECT ticker, goal_usdc FROM fund`);
      for (const f of funds) {
        try {
          const [fundPda] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from('fund'), Buffer.from(f.ticker)], pk);
          const addr = fundPda.toBase58();
          this.db.run(`UPDATE fund SET onchain_addr=? WHERE ticker=?`, [addr, f.ticker]);
          const acc = await connection.getAccountInfo(fundPda);
          if (acc && acc.data) {
            const raised = decodeRaised(acc.data);
            if (raised != null) {
              const usdc = Math.round((raised / 1e6) * 100) / 100;
              const pct = f.goal_usdc > 0 ? Math.min(999, Math.round((usdc / f.goal_usdc) * 100)) : 0;
              this.db.run(`UPDATE fund SET raised_usdc=?, pct=? WHERE ticker=?`, [usdc, pct, f.ticker]);
              this.log.log(`backfill ${f.ticker}: raised=${usdc} pct=${pct} addr=${addr.slice(0, 4)}…`);
            }
          }
        } catch (inner) { this.log.warn(`sync ${f.ticker} failed: ${(inner as Error).message}`); }
      }
      this.db.save();
    } catch (e) { this.log.warn('syncFundsFromChain failed: ' + (e as Error).message); }
  }
}

// Anchor のイベントは BN/PublicKey を含むので素の値へ正規化
function normalize(d: any): any {
  const out: any = {};
  for (const k of Object.keys(d || {})) {
    const v = d[k];
    if (v == null) out[k] = v;
    else if (typeof v?.toBase58 === 'function') out[k] = v.toBase58();
    else if (typeof v?.toString === 'function' && (v.constructor?.name === 'BN' || typeof v === 'bigint')) out[k] = v.toString();
    else out[k] = v;
  }
  return out;
}

// Fund アカウントの raised(u64) をデコード。
// レイアウト: disc(8) + authority/oracle/usdc_mint/prize_mint/vault(32*5)
//   + ticker(string: u32 len + bytes) + goal(8) + deadline(8) + draw_at(8) + raised(8) ...
function decodeRaised(data: Buffer): number | null {
  try {
    let o = 8 + 32 * 5;
    const tlen = data.readUInt32LE(o); o += 4 + tlen;
    o += 8; // goal
    o += 8; // deadline
    o += 8; // draw_at
    return Number(data.readBigUInt64LE(o));
  } catch (e) { return null; }
}
