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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const db_service_1 = require("../db/db.service");
const scheduler_service_1 = require("./scheduler.service");
/**
 * プロトタイプ専用の管理エンドポイント（締切などを決定的にテストするため）。
 * ALLOW_ADMIN=false で無効化。本番では必ず無効化 or 認可を付与すること。
 */
class ExpireDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExpireDto.prototype, "meetGoal", void 0);
let AdminController = class AdminController {
    constructor(db, scheduler) {
        this.db = db;
        this.scheduler = scheduler;
    }
    guard() {
        if (process.env.ALLOW_ADMIN === 'false')
            throw new common_1.ForbiddenException('admin は無効です');
    }
    tick() { this.guard(); return this.scheduler.tick(); }
    // 募集締切を過去にする。meetGoal=true なら達成済み(raised=goal)に、false/未指定なら未達のまま。
    expire(ticker, dto) {
        this.guard();
        const past = new Date(Date.now() - 1000).toISOString();
        if (dto?.meetGoal) {
            this.db.run(`UPDATE fund SET deadline=?, status='open', raised_usdc=goal_usdc, pct=100 WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
        }
        else {
            this.db.run(`UPDATE fund SET deadline=?, status='open' WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
        }
        this.db.save();
        return { ok: true, ticker, deadline: past, meetGoal: !!dto?.meetGoal };
    }
    // 抽選期日を過去にする（locked にして自動抽選を起こす）
    forceDrawDue(ticker) {
        this.guard();
        const past = new Date(Date.now() - 1000).toISOString();
        this.db.run(`UPDATE fund SET status='locked', draw_at=? WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
        this.db.save();
        return { ok: true, ticker, drawAt: past };
    }
    // 指定カードの公開時刻を過去にする（時限公開をテスト）
    reveal(ticker, idx) {
        this.guard();
        const past = new Date(Date.now() - 1000).toISOString();
        this.db.run(`UPDATE fund_card SET reveal_at=? WHERE fund_ticker=? COLLATE NOCASE AND idx=?`, [past, ticker, Number(idx)]);
        this.db.save();
        return { ok: true, ticker, idx: Number(idx) };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('tick'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "tick", null);
__decorate([
    (0, common_1.Post)('funds/:ticker/expire'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ExpireDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "expire", null);
__decorate([
    (0, common_1.Post)('funds/:ticker/force-draw-due'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "forceDrawDue", null);
__decorate([
    (0, common_1.Post)('funds/:ticker/reveal/:idx'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Param)('idx')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reveal", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [db_service_1.DbService, scheduler_service_1.SchedulerService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map