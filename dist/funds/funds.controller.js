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
exports.FundsController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const funds_service_1 = require("./funds.service");
const user_id_decorator_1 = require("../common/user-id.decorator");
class ApplyDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApplyDto.prototype, "tier", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ApplyDto.prototype, "qty", void 0);
let FundsController = class FundsController {
    constructor(funds) {
        this.funds = funds;
    }
    list() { return this.funds.list(); }
    detail(t) { return this.funds.detail(t); }
    cards(t) { return this.funds.cards(t); }
    schedule(t) { return this.funds.schedule(t); }
    lottery(t) { return this.funds.lottery(t); }
    apply(t, dto, userId) {
        return this.funds.apply(t, dto.tier, dto.qty, userId);
    }
    draw(t) { return this.funds.draw(t); }
};
exports.FundsController = FundsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':ticker'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(':ticker/cards'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "cards", null);
__decorate([
    (0, common_1.Get)(':ticker/schedule'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "schedule", null);
__decorate([
    (0, common_1.Get)(':ticker/lottery'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "lottery", null);
__decorate([
    (0, common_1.Post)(':ticker/apply'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ApplyDto, String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "apply", null);
__decorate([
    (0, common_1.Post)(':ticker/draw'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FundsController.prototype, "draw", null);
exports.FundsController = FundsController = __decorate([
    (0, common_1.Controller)('funds'),
    __metadata("design:paramtypes", [funds_service_1.FundsService])
], FundsController);
//# sourceMappingURL=funds.controller.js.map