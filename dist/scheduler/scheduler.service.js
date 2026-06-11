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
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const crypto_1 = require("crypto");
const db_service_1 = require("../db/db.service");
const DRAW_DELAY_MS = 72 * 3600_000; // 達成ロックから抽選まで +72h
/**
 * インプロセス・スケジューラ（Redis 不要）。
 * 周期 tick で以下を処理:
 *  1) ミステリーカードの時限公開（reveal_at 到来で is_mystery=0 に確定）
 *  2) 締切判定: 達成→locked(+72h で draw_at 設定) / 未達→refunded(全額返金)
 *  3) 自動抽選: locked かつ draw_at 到来 → 擬似VRF抽選 → distributed
 */
let SchedulerService = class SchedulerService {
    constructor(db) {
        this.db = db;
        this.log = new common_1.Logger('Scheduler');
    }
    scheduledTick() {
        try {
            const r = this.tick();
            const n = r.revealed.length + r.locked.length + r.refunded.length + r.drawn.length;
            if (n)
                this.log.log(`tick: revealed=${r.revealed.length} locked=${r.locked.length} refunded=${r.refunded.length} drawn=${r.drawn.length}`);
        }
        catch (e) {
            this.log.error('tick failed: ' + e.message);
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
    revealCards(nowISO) {
        const rows = this.db.all(`SELECT fund_ticker, idx FROM fund_card WHERE is_mystery=1 AND reveal_at IS NOT NULL AND reveal_at <= ?`, [nowISO]);
        for (const c of rows) {
            this.db.run(`UPDATE fund_card SET is_mystery=0 WHERE fund_ticker=? AND idx=?`, [c.fund_ticker, c.idx]);
        }
        return rows.map((c) => `${c.fund_ticker}#${c.idx}`);
    }
    judgeDeadlines(nowISO) {
        const locked = [];
        const refunded = [];
        const open = this.db.all(`SELECT * FROM fund WHERE status='open' AND deadline IS NOT NULL AND deadline <= ?`, [nowISO]);
        for (const f of open) {
            if (f.raised_usdc >= f.goal_usdc) {
                const drawAt = new Date(new Date(f.deadline).getTime() + DRAW_DELAY_MS).toISOString();
                this.db.run(`UPDATE fund SET status='locked', draw_at=? WHERE ticker=?`, [drawAt, f.ticker]);
                locked.push(f.ticker);
            }
            else {
                this.refundFund(f);
                this.db.run(`UPDATE fund SET status='refunded' WHERE ticker=?`, [f.ticker]);
                refunded.push(f.ticker);
            }
        }
        return { locked, refunded };
    }
    /** 未達ファンドの全チケットを全額返金（USDC を各ユーザーへ戻す） */
    refundFund(f) {
        const tickets = this.db.all(`SELECT id, user_id, paid_usdc FROM ticket WHERE fund_ticker=?`, [f.ticker]);
        for (const t of tickets) {
            this.db.run(`UPDATE wallet SET usdc = usdc + ? WHERE user_id=?`, [t.paid_usdc, t.user_id]);
            this.db.run(`INSERT INTO txn(id,user_id,type,detail,icon,amount,up,created_at) VALUES(?,?,?,?,?,?,?,?)`, [(0, crypto_1.randomUUID)(), t.user_id, '返金', `${f.name} 落選/未達`, 'refund', t.paid_usdc, 1, new Date().toISOString()]);
        }
    }
    autoDraw(nowISO) {
        const drawn = [];
        const due = this.db.all(`SELECT * FROM fund WHERE status='locked' AND draw_at IS NOT NULL AND draw_at <= ?`, [nowISO]);
        for (const f of due) {
            const lot = this.db.get(`SELECT result_json FROM lottery WHERE fund_ticker=?`, [f.ticker]);
            if (lot) {
                const proof = {
                    vrfRequest: 'vrf_' + (0, crypto_1.randomBytes)(8).toString('hex'),
                    vrfProof: '0x' + (0, crypto_1.randomBytes)(32).toString('hex'),
                    txSig: (0, crypto_1.randomBytes)(32).toString('base64url'),
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
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Interval)(Number(process.env.SCHED_INTERVAL_MS) || 15000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchedulerService.prototype, "scheduledTick", null);
exports.SchedulerService = SchedulerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map