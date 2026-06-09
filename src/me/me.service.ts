import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class MeService {
  constructor(private readonly db: DbService) {}

  private user(userId: string) {
    return this.db.get(`SELECT id, wallet, handle FROM app_user WHERE id=?`, [userId]) || { id: userId, wallet: null, handle: null };
  }
  private walletRow(userId: string) {
    return this.db.get(`SELECT usdc, cheez FROM wallet WHERE user_id=?`, [userId]) || { usdc: 0, cheez: 0 };
  }

  wallet(userId: string) {
    const w = this.walletRow(userId);
    return { usdcBalance: w.usdc, cheezBalance: w.cheez, user: this.user(userId) };
  }

  holdings(userId: string) {
    const tokens = Object.fromEntries(this.db.all(`SELECT ticker, price FROM token`).map((t) => [t.ticker, t.price]));
    const holdings = this.db.all(`SELECT * FROM holding WHERE user_id=? ORDER BY rowid`, [userId]).map((h) => ({
      ticker: h.token_ticker, name: h.name, color: h.color, amount: h.amount,
      valueUsdc: Math.round(h.amount * (tokens[h.token_ticker] || 0) * 100) / 100, change24h: h.change24h,
    }));
    return { holdings };
  }

  tickets(userId: string) {
    const tickets = this.db.all(`SELECT * FROM ticket WHERE user_id=? ORDER BY created_at DESC`, [userId]).map((t) => ({
      fundTicker: t.fund_ticker, tier: t.tier, qty: t.qty, entries: t.entries, paidUsdc: t.paid_usdc,
      ticketNumbers: JSON.parse(t.ticket_numbers || '[]'), isNft: !!t.is_nft, createdAt: t.created_at,
    }));
    return { tickets };
  }

  // ティア別の保有チケット枚数（IPO中は価格が無いので枚数で表示）。
  ticketHoldings(userId: string) {
    const rows = this.db.all(
      `SELECT tier, SUM(qty) q, SUM(entries) e, SUM(paid_usdc) paid FROM ticket WHERE user_id=? GROUP BY tier`, [userId]);
    const byTier: { silver: number; gold: number; rainbow: number } = { silver: 0, gold: 0, rainbow: 0 };
    let entries = 0, paid = 0;
    for (const r of rows) {
      const t = String(r.tier || '').toLowerCase();
      if ((byTier as any)[t] != null) (byTier as any)[t] = Number(r.q) || 0;
      entries += Number(r.e) || 0; paid += Number(r.paid) || 0;
    }
    const funds = this.db.all(`SELECT DISTINCT fund_ticker FROM ticket WHERE user_id=?`, [userId]).map((r) => r.fund_ticker);
    return {
      byTier,
      totalTickets: byTier.silver + byTier.gold + byTier.rainbow,
      entries,
      paidUsdc: Math.round(paid * 100) / 100,
      activeIpos: funds.length,
      funds,
    };
  }

  transactions(userId: string) {
    const transactions = this.db.all(`SELECT * FROM txn WHERE user_id=? ORDER BY created_at DESC`, [userId]).map((x) => ({
      type: x.type, detail: x.detail, icon: x.icon, amount: x.amount, up: !!x.up,
    }));
    return { transactions };
  }

  portfolio(userId: string) {
    const w = this.walletRow(userId);
    const holdings = this.holdings(userId).holdings;
    const holdingsValue = holdings.reduce((s, h) => s + (h.valueUsdc || 0), 0);
    const activeIpos = this.db.all(`SELECT DISTINCT fund_ticker FROM ticket WHERE user_id=?`, [userId]).map((r) => r.fund_ticker);
    const ticketCount = this.db.get(`SELECT COUNT(*) c FROM ticket WHERE user_id=?`, [userId]).c;
    return {
      user: this.user(userId),
      wallet: { usdcBalance: w.usdc, cheezBalance: w.cheez },
      totalValueUsdc: Math.round((w.usdc + holdingsValue) * 100) / 100,
      holdings, activeIpos, ticketCount,
    };
  }

  // 自分視点の抽選結果。デモユーザーは seed の "you" を使用。
  results(userId: string) {
    const rows = this.db.all(`SELECT fund_ticker, proof_json, result_json FROM lottery`);
    const results = rows.map((r) => {
      const res = JSON.parse(r.result_json);
      const you = res.you || {};
      return {
        ticker: r.fund_ticker, status: you.status, ticketNumbers: you.ticketNumbers,
        card: you.card || null, refund: you.refund || null,
        proof: r.proof_json ? JSON.parse(r.proof_json) : null,
      };
    });
    return { results };
  }
}
