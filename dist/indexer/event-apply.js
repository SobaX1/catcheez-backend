"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyEvent = applyEvent;
/**
 * オンチェーンイベント → DB 反映（純粋ロジック。チェーン非依存でテスト可能）。
 * 数値はチェーン側 base 単位(USDC=6 decimals)。DB は USDC 実数で保持するため /1e6。
 * fund は FundInitialized で onchain_addr とマッピングし、以降は addr で解決。
 */
const USDC = (raw) => Math.round(Number(raw) / 1e6 * 100) / 100;
function statusFromEvent(s) {
    // anchor enum は {locked:{}} 形式 or 文字列。両対応。
    if (typeof s === 'string')
        return s.toLowerCase();
    if (s && typeof s === 'object')
        return Object.keys(s)[0]?.toLowerCase() || 'open';
    return 'open';
}
function applyEvent(db, name, data) {
    switch (name) {
        case 'FundInitialized': {
            const ticker = data.ticker;
            const goal = USDC(data.goal);
            const deadline = new Date(Number(data.deadline) * 1000).toISOString();
            const existing = db.get(`SELECT ticker FROM fund WHERE ticker=? COLLATE NOCASE`, [ticker]);
            if (existing) {
                db.run(`UPDATE fund SET onchain_addr=?, goal_usdc=?, deadline=?, status='open' WHERE ticker=? COLLATE NOCASE`, [data.fund, goal, deadline, ticker]);
            }
            else {
                db.run(`INSERT INTO fund(ticker,name,color,goal_usdc,raised_usdc,pct,min_ticket,deadline,deadline_text,duration_days,holders,status,card_count,mystery_count,onchain_addr)
                VALUES(?,?,?,?,0,0,0,?,?,0,0,'open',0,0,?)`, [ticker, ticker, '#888', goal, deadline, '', data.fund]);
            }
            return { name, effect: `fund ${ticker} upserted (addr ${short(data.fund)})` };
        }
        case 'TicketBought': {
            const f = fundByAddr(db, data.fund);
            if (!f)
                return { name, effect: 'fund not mapped; skipped' };
            const raised = USDC(data.raised);
            const pct = f.goal_usdc > 0 ? Math.min(999, Math.round((raised / f.goal_usdc) * 100)) : 0;
            db.run(`UPDATE fund SET raised_usdc=?, pct=? WHERE ticker=?`, [raised, pct, f.ticker]);
            // owner→user（無ければ作成）し、amount/entries からティアを逆算してチケットを記録
            try {
                const owner = data.owner;
                if (owner) {
                    let u = db.get(`SELECT id FROM app_user WHERE wallet=?`, [owner]);
                    if (!u) {
                        const uid = 'usr_' + Math.random().toString(36).slice(2, 10);
                        db.run(`INSERT INTO app_user(id,wallet,handle,created_at) VALUES(?,?,?,?)`, [uid, owner, short(owner), new Date().toISOString()]);
                        u = { id: uid };
                    }
                    const det = deriveTier(Number(data.amount), Number(data.entries));
                    db.run(`INSERT INTO ticket(id,user_id,fund_ticker,tier,qty,entries,paid_usdc,ticket_numbers,is_nft,created_at)
                  VALUES(?,?,?,?,?,?,?,?,?,?)`, [rid(), u.id, f.ticker, det.tier, det.qty, Number(data.entries), USDC(data.amount), '[]', 1, new Date().toISOString()]);
                }
            }
            catch (e) { /* ティア記録の失敗は調達額更新を妨げない */ }
            return { name, effect: `${f.ticker} raised=${raised} pct=${pct}` };
        }
        case 'Settled': {
            const f = fundByAddr(db, data.fund);
            if (!f)
                return { name, effect: 'fund not mapped; skipped' };
            const st = statusFromEvent(data.status); // locked | refunding
            db.run(`UPDATE fund SET status=? WHERE ticker=?`, [st === 'refunding' ? 'refunded' : st, f.ticker]);
            return { name, effect: `${f.ticker} → ${st}` };
        }
        case 'Drawn': {
            const f = fundByAddr(db, data.fund);
            if (!f)
                return { name, effect: 'fund not mapped; skipped' };
            const rnd = toHex(data.randomness);
            const row = db.get(`SELECT proof_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
            const proof = Object.assign(row && row.proof_json ? JSON.parse(row.proof_json) : {}, {
                vrfProof: '0x' + rnd, drawnAt: new Date().toISOString(), source: 'on-chain',
            });
            if (row)
                db.run(`UPDATE lottery SET proof_json=? WHERE fund_ticker=?`, [JSON.stringify(proof), f.ticker]);
            else
                db.run(`INSERT INTO lottery(fund_ticker, proof_json, result_json) VALUES(?,?,?)`, [f.ticker, JSON.stringify(proof), JSON.stringify({ you: {}, winners: [] })]);
            db.run(`UPDATE fund SET status='distributed' WHERE ticker=?`, [f.ticker]);
            return { name, effect: `${f.ticker} drawn; randomness stored` };
        }
        case 'WinnersRootPosted': {
            const f = fundByAddr(db, data.fund);
            if (!f)
                return { name, effect: 'fund not mapped; skipped' };
            const row = db.get(`SELECT proof_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
            const proof = Object.assign(row && row.proof_json ? JSON.parse(row.proof_json) : {}, { merkleRoot: '0x' + toHex(data.root) });
            if (row)
                db.run(`UPDATE lottery SET proof_json=? WHERE fund_ticker=?`, [JSON.stringify(proof), f.ticker]);
            else
                db.run(`INSERT INTO lottery(fund_ticker, proof_json, result_json) VALUES(?,?,?)`, [f.ticker, JSON.stringify(proof), JSON.stringify({ you: {}, winners: [] })]);
            return { name, effect: `${f.ticker} merkleRoot stored` };
        }
        case 'Claimed': {
            const f = fundByAddr(db, data.fund);
            if (!f)
                return { name, effect: 'fund not mapped; skipped' };
            const u = db.get(`SELECT id FROM app_user WHERE wallet=?`, [data.owner]);
            if (u) {
                const won = !!data.won;
                db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`, [rid(), u.id, won ? '当選・賞品受取' : '返金', `${f.ticker} ${won ? 'win' : 'refund'}`,
                    won ? 'pay' : 'refund', won ? 0 : USDC(data.refunded || 0), 1, new Date().toISOString()]);
            }
            return { name, effect: `${f.ticker} claim (${data.won ? 'win' : 'refund'}) for ${short(data.owner)}` };
        }
        default:
            return { name, effect: 'ignored (unknown event)' };
    }
}
function fundByAddr(db, addr) {
    return db.get(`SELECT * FROM fund WHERE onchain_addr=?`, [addr]);
}
// ティア定義（base 単位: USDC=6 decimals）。amount=price*qty, entries=mult*qty から一意に逆算できる。
const TIERS = [
    { tier: 'silver', price: 10_000_000, mult: 1 },
    { tier: 'gold', price: 50_000_000, mult: 6 },
    { tier: 'rainbow', price: 100_000_000, mult: 15 },
];
function deriveTier(amount, entries) {
    for (const t of TIERS) {
        if (amount % t.price === 0) {
            const qty = amount / t.price;
            if (qty > 0 && entries === t.mult * qty)
                return { tier: t.tier, qty };
        }
    }
    const t = TIERS.find((x) => entries % x.mult === 0) || TIERS[0];
    return { tier: t.tier, qty: Math.max(1, Math.round(entries / t.mult)) };
}
function short(s) { return s ? s.slice(0, 4) + '…' + s.slice(-4) : '?'; }
function rid() { return 'evt_' + Math.random().toString(36).slice(2, 10); }
function toHex(arr) {
    if (typeof arr === 'string')
        return arr.replace(/^0x/, '');
    const a = Array.isArray(arr) ? arr : Array.from(arr || []);
    return a.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('');
}
//# sourceMappingURL=event-apply.js.map