"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const db_service_1 = require("../db/db.service");
const seed_data_1 = require("../seed/seed.data");
let FundsService = class FundsService {
    constructor(db) {
        this.db = db;
    }
    summary(f) {
        return {
            ticker: f.ticker, name: f.name, color: f.color, status: f.status,
            goalUsdc: f.goal_usdc, raisedUsdc: f.raised_usdc, pct: f.pct,
            minTicket: f.min_ticket, deadline: f.deadline, deadlineText: f.deadline_text,
            holders: f.holders, cardCount: f.card_count,
        };
    }
    list() {
        const funds = this.db.all(`SELECT * FROM fund ORDER BY rowid`).map((f) => this.summary(f));
        return { funds, tiers: seed_data_1.TIERS };
    }
    detail(ticker) {
        const f = this.requireFund(ticker);
        return { ...this.summary(f), backingTotal: f.raised_usdc, durationDays: f.duration_days, tiers: seed_data_1.TIERS };
    }
    cards(ticker) {
        const f = this.requireFund(ticker);
        const now = Date.now();
        const rows = this.db.all(`SELECT * FROM fund_card WHERE fund_ticker=? ORDER BY idx`, [f.ticker]);
        const cards = rows.map((c) => {
            const revealed = !c.is_mystery || (c.reveal_at && new Date(c.reveal_at).getTime() <= now);
            return revealed
                ? { idx: c.idx, name: c.name, grade: c.grade, refValue: c.ref_value, art: c.art, isMystery: !!c.is_mystery, revealAt: c.reveal_at, imageUrl: null }
                : { idx: c.idx, isMystery: true, revealAt: c.reveal_at };
        });
        return { ticker: f.ticker, cards };
    }
    schedule(ticker) {
        const f = this.requireFund(ticker);
        return {
            ticker: f.ticker,
            steps: [
                { phase: 'Day 0', title: '募集開始', desc: `目標額 $${Number(f.goal_usdc).toLocaleString()} ＋ 募集期間 ${f.duration_days}日 をオンチェーン記録` },
                { phase: `Day 0–${f.duration_days}`, title: '応募期間', desc: 'USDC でチケット購入。達成率を集計' },
                { phase: '締切', title: '達成判定', desc: '達成 → ロック（mcap = raised = backing）／未達 → 全員に全額返金' },
                { phase: '+72h', title: 'VRF抽選', desc: 'Switchboard VRF で当選確定。倍率 = チケット × 紹介 × ランク' },
                { phase: '抽選後', title: '配布・返金', desc: '当選 → pNFT/ファンドトークン配布、落選 → 全額返金 ＋ 次回ボーナス' },
                { phase: '随時', title: 'セカンダリ', desc: 'ボンディングカーブ取引 → 卒業 → Jupiter/Magic Eden、物理カード償還(2%)' },
            ],
        };
    }
    apply(ticker, tierId, qty, userId) {
        const f = this.requireFund(ticker);
        if (f.status !== 'open')
            throw new common_1.BadRequestException(`ファンドは募集中ではありません（status=${f.status}）`);
        const tier = seed_data_1.TIERS.find((t) => t.id === tierId);
        if (!tier)
            throw new common_1.BadRequestException(`不明なティア: ${tierId}`);
        if (!Number.isInteger(qty) || qty < 1)
            throw new common_1.BadRequestException('qty は1以上の整数');
        const paidUsdc = qty * tier.price;
        const w = this.wallet(userId);
        if (w.usdc < paidUsdc)
            throw new common_1.BadRequestException(`USDC残高不足（必要 $${paidUsdc} / 残高 $${w.usdc}）`);
        const entries = qty * tier.mult;
        const prefix = f.ticker[0];
        const ticketNumbers = Array.from({ length: qty }, () => `${prefix}-${Math.floor(1000 + Math.random() * 8999)}`);
        const newUsdc = Math.round((w.usdc - paidUsdc) * 100) / 100;
        const raised = f.raised_usdc + paidUsdc;
        const pct = Math.min(999, Math.round((raised / f.goal_usdc) * 100));
        const status = raised >= f.goal_usdc ? 'locked' : f.status;
        this.db.run(`UPDATE wallet SET usdc=? WHERE user_id=?`, [newUsdc, userId]);
        this.db.run(`UPDATE fund SET raised_usdc=?, pct=?, status=? WHERE ticker=?`, [raised, pct, status, f.ticker]);
        this.db.run(`INSERT INTO ticket(id,user_id,fund_ticker,tier,qty,entries,paid_usdc,ticket_numbers,is_nft,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), userId, f.ticker, tierId, qty, entries, paidUsdc, JSON.stringify(ticketNumbers), 1, new Date().toISOString()]);
        this.db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), userId, 'チケット購入', `${f.name} · ${qty}枚`, 'buy', -paidUsdc, 0, new Date().toISOString()]);
        this.db.save();
        const ticket = { fundTicker: f.ticker, tier: tierId, qty, entries, paidUsdc, ticketNumbers, isNft: true };
        return { ticket, fund: this.summary(this.requireFund(ticker)), wallet: { usdcBalance: newUsdc, cheezBalance: w.cheez } };
    }
    draw(ticker) {
        const f = this.requireFund(ticker);
        const row = this.db.get(`SELECT result_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
        if (!row)
            throw new common_1.BadRequestException('このファンドに抽選データがありません');
        const proof = {
            vrfRequest: 'vrf_' + (0, crypto_1.randomBytes)(8).toString('hex'),
            vrfProof: '0x' + (0, crypto_1.randomBytes)(32).toString('hex'),
            txSig: (0, crypto_1.randomBytes)(32).toString('base64url'),
            drawnAt: new Date().toISOString(),
            verifyUrl: `https://explorer.solana.com/tx/MOCK_${f.ticker}`,
            note: 'M2: 擬似VRF。M3 で Switchboard VRF コールバックに置換（改変不能・検証可能）',
        };
        this.db.run(`UPDATE lottery SET proof_json=? WHERE fund_ticker=?`, [JSON.stringify(proof), f.ticker]);
        this.db.run(`UPDATE fund SET status='distributed' WHERE ticker=?`, [f.ticker]);
        this.db.save();
        return { ticker: f.ticker, proof, result: JSON.parse(row.result_json) };
    }
    lottery(ticker) {
        const f = this.requireFund(ticker);
        const row = this.db.get(`SELECT proof_json, result_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
        if (!row)
            throw new common_1.NotFoundException('抽選結果がまだありません');
        const result = JSON.parse(row.result_json);
        // participants 等を ticket テーブルの実数で上書き（誤解防止）。
        // 当選枠/当選率は抽選後に確定するためここでは触れない。
        const st = this.ticketStats(f.ticker);
        if (result && result.meta) {
            result.meta.participants = st.users;
            result.meta.ticketQty = st.qty;
            result.meta.entries = st.entries;
            result.meta.tierBreakdown = st.breakdown;
        }
        return { ticker: f.ticker, proof: row.proof_json ? JSON.parse(row.proof_json) : null, result };
    }
    /** ticket テーブルからファンドの参加実数を集計（参加者数・枚数・エントリ・ティア別内訳）。 */
    ticketStats(ticker) {
        const tot = this.db.get(`SELECT COUNT(DISTINCT user_id) AS users, COALESCE(SUM(qty),0) AS qty, COALESCE(SUM(entries),0) AS entries
       FROM ticket WHERE fund_ticker=?`, [ticker]) || { users: 0, qty: 0, entries: 0 };
        const rows = this.db.all(`SELECT tier, COALESCE(SUM(qty),0) AS qty, COALESCE(SUM(entries),0) AS entries
       FROM ticket WHERE fund_ticker=? GROUP BY tier`, [ticker]);
        const breakdown = {
            silver: { qty: 0, entries: 0 }, gold: { qty: 0, entries: 0 }, rainbow: { qty: 0, entries: 0 },
        };
        rows.forEach((r) => { if (breakdown[r.tier])
            breakdown[r.tier] = { qty: r.qty, entries: r.entries }; });
        return { users: tot.users, qty: tot.qty, entries: tot.entries, breakdown };
    }
    wallet(userId) {
        const w = this.db.get(`SELECT usdc, cheez FROM wallet WHERE user_id=?`, [userId]);
        return w || { usdc: 0, cheez: 0 };
    }
    requireFund(ticker) {
        const f = this.db.get(`SELECT * FROM fund WHERE ticker=? COLLATE NOCASE`, [ticker]);
        if (!f)
            throw new common_1.NotFoundException(`ファンドが見つかりません: ${ticker}`);
        return f;
    }
};
exports.FundsService = FundsService;
exports.FundsService = FundsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], FundsService);
//# sourceMappingURL=funds.service.js.map