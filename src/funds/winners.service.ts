import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { selectWinners, buildWinnerSet, hexProofToBytes, Participant } from './merkle';

@Injectable()
export class WinnersService {
  constructor(private readonly db: DbService) {}

  private requireFund(ticker: string) {
    const f = this.db.get(`SELECT * FROM fund WHERE ticker=? COLLATE NOCASE`, [ticker]);
    if (!f) throw new NotFoundException(`fund ${ticker} not found`);
    return f;
  }

  /** ファンドの参加者（owner pubkey と entries 合計）を tickets から集計。 */
  private participants(ticker: string): Participant[] {
    const rows = this.db.all(
      `SELECT u.wallet owner, SUM(t.entries) entries
         FROM ticket t JOIN app_user u ON u.id=t.user_id
        WHERE t.fund_ticker=? COLLATE NOCASE AND u.wallet IS NOT NULL AND u.wallet<>''
        GROUP BY u.wallet`,
      [ticker],
    );
    return rows
      .filter((r: any) => Number(r.entries) > 0)
      .map((r: any) => ({ owner: String(r.owner), entries: Number(r.entries) }));
  }

  /**
   * 運用者(authority)が呼ぶ：randomness と当選枠数から当選者を決定し、root と proof を保存。
   * 返り値の root を post_winners_root でオンチェーン送信する（送信は運用者の手元署名）。
   */
  drawWinners(ticker: string, randomnessHex: string, slots: number) {
    const f = this.requireFund(ticker);
    const rnd = Buffer.from(String(randomnessHex).replace(/^0x/, ''), 'hex');
    if (rnd.length !== 32) throw new NotFoundException('randomness must be 32 bytes hex');
    const parts = this.participants(f.ticker);
    if (!parts.length) throw new NotFoundException('参加者(チケット)が見つかりません');

    const winners = selectWinners(parts, Math.max(1, Number(slots) || 1), rnd);
    const ws = buildWinnerSet(winners);

    // 保存（再実行は冪等：同 fund の旧データを置換）
    this.db.run(`DELETE FROM winner WHERE fund_ticker=? COLLATE NOCASE`, [f.ticker]);
    for (const w of winners) {
      this.db.run(
        `INSERT INTO winner(fund_ticker, owner, entries, proof_json, root_hex, created_at)
         VALUES(?,?,?,?,?,?)`,
        [f.ticker, w.owner, w.entries, JSON.stringify(ws.proofs[w.owner]), ws.rootHex, new Date().toISOString()],
      );
    }
    // ===== ハズレ特典: 非当選者にCZP還元（案4: ボーナスチケットは廃止）=====
    const consolation = this.grantConsolation(f, winners.map((w) => w.owner));

    return { ticker: f.ticker, root: ws.rootHex, winnerCount: winners.length, slots: Number(slots), consolation };
  }

  /** フロントが叩く：owner が当選者なら proof（number[][]）を返す。非当選は won:false。 */
  proof(ticker: string, owner: string) {
    const f = this.requireFund(ticker);
    const row = this.db.get(
      `SELECT owner, entries, proof_json, root_hex FROM winner WHERE fund_ticker=? COLLATE NOCASE AND owner=?`,
      [f.ticker, owner],
    );
    if (!row) return { ticker: f.ticker, owner, won: false, proof: null };
    return {
      ticker: f.ticker,
      owner,
      won: true,
      entries: row.entries,
      root: row.root_hex,
      proof: hexProofToBytes(JSON.parse(row.proof_json)),
    };
  }

  /**
   * 非当選の参加者に「ハズレ特典」を配布する。
   * - CZP還元: 支払ったチケット代の一部をCZPで返す（p2e_ledger に記録）
   * - 応募ポイント（ランク進捗）は応募時点で既に加算済みのため、ここでは追加しない
   * 冪等性: 同 fund で既に consolation 済みなら二重付与しない。
   */
  private grantConsolation(f: any, winnerWallets: string[]) {
    const winnerSet = new Set(winnerWallets.map((w) => String(w)));
    // 参加者を user 単位で取得（支払額の集計のため ticket を直接参照）
    const rows = this.db.all(
      `SELECT t.user_id, u.wallet,
              SUM(t.qty) qty, SUM(t.paid_usdc) paid
         FROM ticket t JOIN app_user u ON u.id=t.user_id
        WHERE t.fund_ticker=? COLLATE NOCASE AND u.wallet IS NOT NULL AND u.wallet<>''
        GROUP BY t.user_id`,
      [f.ticker],
    );
    const now = new Date().toISOString();
    // 設定値（p2e_config 経由。無ければ既定）
    const cfg = (k: string, d: number) => {
      const r = this.db.get(`SELECT v FROM p2e_config WHERE k=?`, [k]);
      if (r?.v != null) { const n = Number(JSON.parse(r.v)); return isNaN(n) ? d : n; }
      return d;
    };
    const refundPct = cfg('consolation_czp_pct', 0.5);   // 支払USDCの何割をCZP換算で返すか
    const czpPerUsdc = cfg('czp_per_usdc', 100);          // 1USDc=何CZP

    let granted = 0;
    for (const r of rows) {
      if (winnerSet.has(String(r.wallet))) continue; // 当選者は対象外
      const uid = r.user_id;
      // 冪等: この fund のこの user に consolation 済みなら skip
      const done = this.db.get(
        `SELECT 1 x FROM p2e_ledger WHERE user_id=? AND kind='consolation' AND scan_id=? LIMIT 1`,
        [uid, 'ipo:' + f.ticker]);
      if (done) continue;

      // 1) CZP還元
      const czp = Math.max(0, Math.round((r.paid || 0) * refundPct * czpPerUsdc));
      if (czp > 0) {
        const bal = (this.db.get(
          `SELECT balance_after b FROM p2e_ledger WHERE user_id=? ORDER BY id DESC LIMIT 1`, [uid])?.b ?? 0) + czp;
        this.db.run(
          `INSERT INTO p2e_ledger (user_id, scan_id, kind, amount, balance_after, created_at) VALUES (?,?,?,?,?,?)`,
          [uid, 'ipo:' + f.ticker, 'consolation', czp, bal, now]);
      }
      granted++;
    }
    this.db.save?.();
    return { losers: granted, refundPct, czpPerUsdc };
  }
}
