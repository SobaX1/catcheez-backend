import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { applyEvent } from './event-apply';

const EVENTS = ['FundInitialized', 'TicketBought', 'Settled', 'Drawn', 'WinnersRootPosted', 'Claimed'];

/**
 * オンチェーンイベントの indexer（ポーリング方式）。
 * 無料の公開RPCは WebSocket(logsSubscribe) の通知が届かないことがあるため、
 * 定期的に getSignaturesForAddress で取引履歴を取得し、ログから Anchor イベントを
 * 復元して DB に反映する。WebSocket(addEventListener) も併用するが、依存はしない。
 * - SOLANA_RPC + PROGRAM_ID + CATCHEEZ_IDL が揃えば有効化。未設定なら idle。
 */
@Injectable()
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Indexer');
  private listeners: number[] = [];
  private pollTimer: any = null;
  private anchor: any = null;
  private connection: any = null;
  private program: any = null;
  private programId = '';
  private polling = false;

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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const anchor: any = require('@coral-xyz/anchor');
      const fs = require('fs');
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      const connection = new anchor.web3.Connection(rpc, 'confirmed');
      const provider = new anchor.AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
      let program: any;
      try { program = new anchor.Program(idl, provider); }
      catch (e) { program = new anchor.Program(idl, programId, provider); }

      this.anchor = anchor;
      this.connection = connection;
      this.program = program;
      this.programId = programId;

      // 起動時の初期同期はバックグラウンドで実行（RPCがハングしても起動をブロックしない）
      const initialSync = (async () => {
        // ファンドの PDA を補完し、現在の調達額をチェーンから読み込む
        await this.syncFundsFromChain();
        // 直近の取引履歴から過去のイベント（過去の購入など）を取り込む
        await this.indexRecentSignatures(60);
      })();
      const timeout = new Promise((_res, rej) =>
        setTimeout(() => rej(new Error('initial sync timeout (20s)')), 20000));
      Promise.race([initialSync, timeout]).then(
        () => this.log.log('initial chain sync done'),
        (e) => this.log.warn('initial chain sync deferred: ' + (e as Error).message),
      );

      // WebSocket でも購読（届けば即時反映。届かなくてもポーリングが拾う）
      try {
        for (const ev of EVENTS) {
          const id = program.addEventListener(ev, (data: any) => {
            try { const r = this.apply(ev, normalize(data)); this.log.log(`event ${ev}: ${r.effect}`); }
            catch (e) { this.log.error(`apply ${ev} failed: ${(e as Error).message}`); }
          });
          this.listeners.push(id);
        }
      } catch (e) { this.log.warn('addEventListener skipped: ' + (e as Error).message); }

      // ポーリング開始（30秒ごとに 調達額 + 新規イベント を取得）
      this.pollTimer = setInterval(() => { this.tick().catch(() => {}); }, 30000);
      this.log.log(`indexer subscribed to ${programId} via ${rpc} (polling every 30s)`);
    } catch (e) {
      this.log.warn('indexer enable failed (install @coral-xyz/anchor?): ' + (e as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    try { for (const id of this.listeners) await this.program?.removeEventListener(id); } catch (e) {}
  }

  private async tick() {
    if (this.polling) return; // 前回の処理が走っていれば重ねない
    this.polling = true;
    try {
      await this.syncFundsFromChain();
      await this.indexRecentSignatures(30);
    } finally { this.polling = false; }
  }

  /** 各 fund 行の PDA を導出して onchain_addr を補完し、現在の raised をチェーンから反映。 */
  private async syncFundsFromChain() {
    if (!this.anchor || !this.connection) return;
    try {
      const pk = new this.anchor.web3.PublicKey(this.programId);
      const funds = this.db.all(`SELECT ticker, goal_usdc, raised_usdc FROM fund`);
      for (const f of funds) {
        try {
          const [fundPda] = this.anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from('fund'), Buffer.from(f.ticker)], pk);
          const addr = fundPda.toBase58();
          this.db.run(`UPDATE fund SET onchain_addr=? WHERE ticker=?`, [addr, f.ticker]);
          const acc = await this.connection.getAccountInfo(fundPda);
          if (acc && acc.data) {
            const raised = decodeRaised(acc.data);
            if (raised != null) {
              const usdc = Math.round((raised / 1e6) * 100) / 100;
              const pct = f.goal_usdc > 0 ? Math.min(999, Math.round((usdc / f.goal_usdc) * 100)) : 0;
              if (usdc !== f.raised_usdc) {
                this.db.run(`UPDATE fund SET raised_usdc=?, pct=? WHERE ticker=?`, [usdc, pct, f.ticker]);
                this.log.log(`backfill ${f.ticker}: raised=${usdc} pct=${pct} addr=${addr.slice(0, 4)}…`);
              }
            }
          }
        } catch (inner) { this.log.warn(`sync ${f.ticker} failed: ${(inner as Error).message}`); }
      }
      this.db.save();
    } catch (e) { this.log.warn('syncFundsFromChain failed: ' + (e as Error).message); }
  }

  /** 直近 limit 件の取引を取得し、未処理のものからイベントを復元して反映。 */
  private async indexRecentSignatures(limit: number) {
    if (!this.anchor || !this.connection || !this.program) return;
    try {
      const pk = new this.anchor.web3.PublicKey(this.programId);
      const sigInfos = await this.connection.getSignaturesForAddress(pk, { limit });
      const ordered = sigInfos.slice().reverse(); // 古い順に処理
      const parser = new this.anchor.EventParser(pk, this.program.coder);
      let applied = 0;
      for (const si of ordered) {
        const sig = si.signature;
        if (si.err) { this.markSeen(sig); continue; }
        if (this.seen(sig)) continue;
        let tx: any = null;
        try {
          tx = await this.connection.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
        } catch (e) {}
        const logs = tx && tx.meta && tx.meta.logMessages ? tx.meta.logMessages : null;
        if (logs) {
          try {
            for (const ev of parser.parseLogs(logs)) {
              // Anchor 0.30 の parseLogs は camelCase（ticketBought）で返すため PascalCase に補正
              const evName = ev.name.charAt(0).toUpperCase() + ev.name.slice(1);
              try { const r = this.apply(evName, normalize(ev.data)); applied++; this.log.log(`poll ${evName}: ${r.effect}`); }
              catch (e) { this.log.error(`apply ${evName} failed: ${(e as Error).message}`); }
            }
          } catch (e) {}
        }
        this.markSeen(sig);
      }
      if (applied > 0) this.db.save();
    } catch (e) { this.log.warn('indexRecentSignatures failed: ' + (e as Error).message); }
  }

  private seen(sig: string): boolean {
    try { return !!this.db.get(`SELECT k FROM meta WHERE k=?`, ['evtsig:' + sig]); } catch (e) { return false; }
  }
  private markSeen(sig: string) {
    try { this.db.run(`INSERT OR REPLACE INTO meta(k,v) VALUES(?,?)`, ['evtsig:' + sig, '1']); } catch (e) {}
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
