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
exports.WinnersService = void 0;
const common_1 = require("@nestjs/common");
const db_service_1 = require("../db/db.service");
const merkle_1 = require("./merkle");
let WinnersService = class WinnersService {
    constructor(db) {
        this.db = db;
    }
    requireFund(ticker) {
        const f = this.db.get(`SELECT * FROM fund WHERE ticker=? COLLATE NOCASE`, [ticker]);
        if (!f)
            throw new common_1.NotFoundException(`fund ${ticker} not found`);
        return f;
    }
    /** ファンドの参加者（owner pubkey と entries 合計）を tickets から集計。 */
    participants(ticker) {
        const rows = this.db.all(`SELECT u.wallet owner, SUM(t.entries) entries
         FROM ticket t JOIN app_user u ON u.id=t.user_id
        WHERE t.fund_ticker=? COLLATE NOCASE AND u.wallet IS NOT NULL AND u.wallet<>''
        GROUP BY u.wallet`, [ticker]);
        return rows
            .filter((r) => Number(r.entries) > 0)
            .map((r) => ({ owner: String(r.owner), entries: Number(r.entries) }));
    }
    /**
     * 運用者(authority)が呼ぶ：randomness と当選枠数から当選者を決定し、root と proof を保存。
     * 返り値の root を post_winners_root でオンチェーン送信する（送信は運用者の手元署名）。
     */
    drawWinners(ticker, randomnessHex, slots) {
        const f = this.requireFund(ticker);
        const rnd = Buffer.from(String(randomnessHex).replace(/^0x/, ''), 'hex');
        if (rnd.length !== 32)
            throw new common_1.NotFoundException('randomness must be 32 bytes hex');
        const parts = this.participants(f.ticker);
        if (!parts.length)
            throw new common_1.NotFoundException('参加者(チケット)が見つかりません');
        const winners = (0, merkle_1.selectWinners)(parts, Math.max(1, Number(slots) || 1), rnd);
        const ws = (0, merkle_1.buildWinnerSet)(winners);
        // 保存（再実行は冪等：同 fund の旧データを置換）
        this.db.run(`DELETE FROM winner WHERE fund_ticker=? COLLATE NOCASE`, [f.ticker]);
        for (const w of winners) {
            this.db.run(`INSERT INTO winner(fund_ticker, owner, entries, proof_json, root_hex, created_at)
         VALUES(?,?,?,?,?,?)`, [f.ticker, w.owner, w.entries, JSON.stringify(ws.proofs[w.owner]), ws.rootHex, new Date().toISOString()]);
        }
        return { ticker: f.ticker, root: ws.rootHex, winnerCount: winners.length, slots: Number(slots) };
    }
    /** フロントが叩く：owner が当選者なら proof（number[][]）を返す。非当選は won:false。 */
    proof(ticker, owner) {
        const f = this.requireFund(ticker);
        const row = this.db.get(`SELECT owner, entries, proof_json, root_hex FROM winner WHERE fund_ticker=? COLLATE NOCASE AND owner=?`, [f.ticker, owner]);
        if (!row)
            return { ticker: f.ticker, owner, won: false, proof: null };
        return {
            ticker: f.ticker,
            owner,
            won: true,
            entries: row.entries,
            root: row.root_hex,
            proof: (0, merkle_1.hexProofToBytes)(JSON.parse(row.proof_json)),
        };
    }
};
exports.WinnersService = WinnersService;
exports.WinnersService = WinnersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], WinnersService);
//# sourceMappingURL=winners.service.js.map