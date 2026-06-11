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
exports.WinnersController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const winners_service_1 = require("./winners.service");
class DrawWinnersDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DrawWinnersDto.prototype, "randomness", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], DrawWinnersDto.prototype, "slots", void 0);
let WinnersController = class WinnersController {
    constructor(winners) {
        this.winners = winners;
    }
    // 運用者(authority)専用：当選者確定＋proof保存。ALLOW_ADMIN=false で無効。
    drawWinners(ticker, dto) {
        if (process.env.ALLOW_ADMIN === 'false')
            throw new common_1.ForbiddenException('admin は無効です');
        return this.winners.drawWinners(ticker, dto.randomness, dto.slots);
    }
    // フロント公開：owner が当選者なら proof を返す。?owner=<pubkey>
    proof(ticker, owner) {
        return this.winners.proof(ticker, owner);
    }
};
exports.WinnersController = WinnersController;
__decorate([
    (0, common_1.Post)(':ticker/draw-winners'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DrawWinnersDto]),
    __metadata("design:returntype", void 0)
], WinnersController.prototype, "drawWinners", null);
__decorate([
    (0, common_1.Get)(':ticker/proof'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Query)('owner')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WinnersController.prototype, "proof", null);
exports.WinnersController = WinnersController = __decorate([
    (0, common_1.Controller)('winners'),
    __metadata("design:paramtypes", [winners_service_1.WinnersService])
], WinnersController);
//# sourceMappingURL=winners.controller.js.map