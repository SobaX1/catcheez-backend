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
    return { ticker: f.ticker, root: ws.rootHex, winnerCount: winners.length, slots: Number(slots) };
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
}
