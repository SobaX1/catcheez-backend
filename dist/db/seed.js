"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEASON = exports.DEMO_USER = void 0;
exports.seedDatabase = seedDatabase;
const crypto_1 = require("crypto");
const seed_data_1 = require("../seed/seed.data");
exports.DEMO_USER = {
    id: 'demo-user',
    wallet: 'DemoWa11et1111111111111111111111111111111',
    handle: 'you',
};
exports.SEASON = '2026-S1';
function seedDatabase(db) {
    const now = new Date().toISOString();
    // デモユーザー + ウォレット
    db.run(`INSERT OR IGNORE INTO app_user(id, wallet, handle, created_at) VALUES(?,?,?,?)`, [exports.DEMO_USER.id, exports.DEMO_USER.wallet, exports.DEMO_USER.handle, now]);
    db.run(`INSERT OR REPLACE INTO wallet(user_id, usdc, cheez) VALUES(?,?,?)`, [exports.DEMO_USER.id, seed_data_1.SEED_WALLET.usdcBalance, seed_data_1.SEED_WALLET.cheezBalance]);
    // ファンド + 構成カード
    for (const f of seed_data_1.SEED_FUNDS) {
        const raised = Math.round((f.goalUsdc * f.pct) / 100);
        const deadline = new Date(Date.now() + f.durationDays * 86400_000).toISOString();
        db.run(`INSERT OR REPLACE INTO fund(ticker,name,color,goal_usdc,raised_usdc,pct,min_ticket,deadline,deadline_text,duration_days,holders,status,card_count,mystery_count)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [f.ticker, f.name, f.color, f.goalUsdc, raised, f.pct, f.minTicket, deadline, f.deadlineText, f.durationDays, f.holders, f.status, f.cardCount, f.mysteryCount]);
        seed_data_1.SEED_COMP.forEach((c, idx) => {
            const isMystery = idx < f.mysteryCount ? 1 : 0;
            const revealAt = isMystery ? new Date(Date.now() + (f.mysteryCount - idx) * 86400_000).toISOString() : null;
            db.run(`INSERT OR REPLACE INTO fund_card(fund_ticker,idx,name,grade,ref_value,art,is_mystery,reveal_at) VALUES(?,?,?,?,?,?,?,?)`, [f.ticker, idx, c.name, c.grade, c.refValue, c.art, isMystery, revealAt]);
        });
    }
    // LIVE銘柄
    for (const t of seed_data_1.SEED_TOKENS) {
        db.run(`INSERT OR REPLACE INTO token(ticker,name,creator,listed_text,color,mcap,change24h,holders,bonding_pct,price,graduated)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`, [t.ticker, t.name, t.creator, t.listedText, t.color, t.mcap, t.change24h, t.holders, t.bondingPct, t.price, t.graduated ? 1 : 0]);
    }
    // 抽選結果（resData 相当）— ファンド単位の JSON
    for (const [ticker, res] of Object.entries(seed_data_1.SEED_LOTTERIES)) {
        db.run(`INSERT OR REPLACE INTO lottery(fund_ticker, proof_json, result_json) VALUES(?,?,?)`, [ticker, null, JSON.stringify(res)]);
    }
    // デモユーザーの保有・チケット・履歴
    for (const h of seed_data_1.SEED_HOLDINGS) {
        db.run(`INSERT OR REPLACE INTO holding(user_id,token_ticker,name,color,amount,change24h) VALUES(?,?,?,?,?,?)`, [exports.DEMO_USER.id, h.ticker, h.name, h.color, h.amount, h.change24h]);
    }
    for (const t of seed_data_1.SEED_TICKETS) {
        db.run(`INSERT INTO ticket(id,user_id,fund_ticker,tier,qty,entries,paid_usdc,ticket_numbers,is_nft,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), exports.DEMO_USER.id, t.fundTicker, t.tier, t.qty, t.entries, t.paidUsdc, JSON.stringify(t.ticketNumbers), 1, now]);
    }
    for (const x of seed_data_1.SEED_TX) {
        db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), exports.DEMO_USER.id, x.type, x.detail, x.icon, x.amount, x.up ? 1 : 0, now]);
    }
    // ガバナンス
    for (const o of seed_data_1.SEED_GOVERNANCE.options) {
        db.run(`INSERT OR REPLACE INTO gov_option(id,proposal_id,label,votes) VALUES(?,?,?,?)`, [o.id, seed_data_1.SEED_GOVERNANCE.proposalId, o.label, o.votes]);
    }
    // ランキング（デモ用の固定シード。"you" はデモユーザーに紐付け）
    for (const r of seed_data_1.SEED_RANKING) {
        const uid = r.isMe ? exports.DEMO_USER.id : 'seed-' + r.handle.replace(/[^\w]/g, '');
        db.run(`INSERT OR REPLACE INTO point(season,user_id,handle,points,is_me) VALUES(?,?,?,?,?)`, [exports.SEASON, uid, r.handle, r.points, r.isMe ? 1 : 0]);
    }
}
//# sourceMappingURL=seed.js.map