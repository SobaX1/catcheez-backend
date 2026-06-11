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
exports.MiscController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const db_service_1 = require("../db/db.service");
const user_id_decorator_1 = require("../common/user-id.decorator");
const seed_1 = require("../db/seed");
class VoteDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VoteDto.prototype, "optionId", void 0);
let MiscController = class MiscController {
    constructor(db) {
        this.db = db;
    }
    ranking(season) {
        const s = season || seed_1.SEASON;
        const ranking = this.db.all(`SELECT handle, points, is_me FROM point WHERE season=? ORDER BY points DESC`, [s])
            .map((r, i) => ({ rank: i + 1, handle: r.handle, points: r.points, isMe: !!r.is_me }));
        return { season: s, ranking };
    }
    governance() {
        const opts = this.db.all(`SELECT id, proposal_id, label, votes FROM gov_option ORDER BY rowid`);
        const proposalId = opts.length ? opts[0].proposal_id : null;
        return {
            proposalId,
            title: '次に組成するファンドを投票で決定',
            options: opts.map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
        };
    }
    vote(dto, userId) {
        const opt = this.db.get(`SELECT id, proposal_id, label, votes FROM gov_option WHERE id=?`, [dto.optionId]);
        if (!opt)
            return { ok: false, error: '不明な選択肢' };
        const already = this.db.get(`SELECT 1 FROM gov_vote WHERE proposal_id=? AND user_id=?`, [opt.proposal_id, userId]);
        if (already)
            return { ok: false, error: '既に投票済みです', proposalId: opt.proposal_id };
        this.db.run(`UPDATE gov_option SET votes=votes+1 WHERE id=?`, [dto.optionId]);
        this.db.run(`INSERT INTO gov_vote(proposal_id,user_id,option_id,created_at) VALUES(?,?,?,?)`, [opt.proposal_id, userId, dto.optionId, new Date().toISOString()]);
        this.db.save();
        return { ok: true, proposalId: opt.proposal_id, voted: { id: opt.id, label: opt.label, votes: opt.votes + 1 } };
    }
};
exports.MiscController = MiscController;
__decorate([
    (0, common_1.Get)('ranking'),
    __param(0, (0, common_1.Query)('season')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "ranking", null);
__decorate([
    (0, common_1.Get)('governance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "governance", null);
__decorate([
    (0, common_1.Post)('governance/vote'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VoteDto, String]),
    __metadata("design:returntype", void 0)
], MiscController.prototype, "vote", null);
exports.MiscController = MiscController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], MiscController);
//# sourceMappingURL=misc.controller.js.map