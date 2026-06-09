import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomBytes, randomUUID } from 'crypto';
import { DbService } from '../db/db.service';

const DRAW_DELAY_MS = 72 * 3600_000; // 達成ロックから抽選まで +72h

/**
 * インプロセス・スケジューラ（Redis 不要）。
 * 周期 tick で以下を処理:
 *  1) ミステリーカードの時限公開（reveal_at 到来で is_mystery=0 に確定）
 *  2) 締切判定: 達成→locked(+72h で draw_at 設定) / 未達→refunded(全額返金)
 *  3) 自動抽選: locked かつ draw_at 到来 → 擬似VRF抽選 → distributed
 */
@Injectable()
export class SchedulerService {
  private readonly log = new Logger('Scheduler');
  constructor(private readonly db: DbService) {}

  @Interval(Number(process.env.SCHED_INTERVAL_MS) || 15000)
  scheduledTick() {
    try {
      const r = this.tick();
      const n = r.revealed.length + r.locked.length + r.refunded.length + r.drawn.length;
      if (n) this.log.log(`tick: revealed=${r.revealed.length} locked=${r.locked.length} refunded=${r.refunded.length} drawn=${r.drawn.length}`);
    } catch (e) {
      this.log.error('tick failed: ' + (e as Error).message);
    }
  }

  /** 全処理を1回実行（テストからも直接呼べる） */
  tick() {
    const nowISO = new Date().toISOString();
    const revealed = this.revealCards(nowISO);
    const { locked, refunded } = this.judgeDeadlines(nowISO);
    const drawn = this.autoDraw(nowISO);
    this.db.save();
    return { revealed, locked, refunded, drawn, at: nowISO };
  }

  private revealCards(nowISO: string): string[] {
    const rows = this.db.all(
      `SELECT fund_ticker, idx FROM fund_card WHERE is_mystery=1 AND reveal_at IS NOT NULL AND reveal_at <= ?`,
      [nowISO],
    );
    for (const c of rows) {
      this.db.run(`UPDATE fund_card SET is_mystery=0 WHERE fund_ticker=? AND idx=?`, [c.fund_ticker, c.idx]);
    }
    return rows.map((c) => `${c.fund_ticker}#${c.idx}`);
  }

  private judgeDeadlines(nowISO: string) {
    const locked: string[] = [];
    const refunded: string[] = [];
    const open = this.db.all(`SELECT * FROM fund WHERE status='open' AND deadline IS NOT NULL AND deadline <= ?`, [nowISO]);
    for (const f of open) {
      if (f.raised_usdc >= f.goal_usdc) {
        const drawAt = new Date(new Date(f.deadline).getTime() + DRAW_DELAY_MS).toISOString();
        this.db.run(`UPDATE fund SET status='locked', draw_at=? WHERE ticker=?`, [drawAt, f.ticker]);
        locked.push(f.ticker);
      } else {
        this.refundFund(f);
        this.db.run(`UPDATE fund SET status='refunded' WHERE ticker=?`, [f.ticker]);
        refunded.push(f.ticker);
      }
    }
    return { locked, refunded };
  }

  /** 未達ファンドの全チケットを全額返金（USDC を各ユーザーへ戻す） */
  private refundFund(f: any) {
    const tickets = this.db.all(`SELECT id, user_id, paid_usdc FROM ticket WHERE fund_ticker=?`, [f.ticker]);
    for (const t of tickets) {
      this.db.run(`UPDATE wallet SET usdc = usdc + ? WHERE user_id=?`, [t.paid_usdc, t.user_id]);
      this.db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`,
        [randomUUID(), t.user_id, '返金', `${f.name} 落選/未達`, 'refund', t.paid_usdc, 1, new Date().toISOString()]);
    }
  }

  private autoDraw(nowISO: string): string[] {
    const drawn: string[] = [];
    const due = this.db.all(`SELECT * FROM fund WHERE status='locked' AND draw_at IS NOT NULL AND draw_at <= ?`, [nowISO]);
    for (const f of due) {
      const lot = this.db.get(`SELECT result_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
      if (lot) {
        const proof = {
          vrfRequest: 'vrf_' + randomBytes(8).toString('hex'),
          vrfProof: '0x' + randomBytes(32).toString('hex'),
          txSig: randomBytes(32).toString('base64url'),
          drawnAt: new Date().toISOString(),
          verifyUrl: `https://explorer.solana.com/tx/MOCK_${f.ticker}`,
          note: 'M4: 自動抽選(擬似VRF)。M3 で Switchboard VRF に置換',
        };
        this.db.run(`UPDATE lottery SET proof_json=? WHERE fund_ticker=?`, [JSON.stringify(proof), f.ticker]);
      }
      this.db.run(`UPDATE fund SET status='distributed' WHERE ticker=?`, [f.ticker]);
      drawn.push(f.ticker);
    }
    return drawn;
  }
}
