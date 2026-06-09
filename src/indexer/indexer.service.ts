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
      const program = new anchor.Program(idl, programId, provider);
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
