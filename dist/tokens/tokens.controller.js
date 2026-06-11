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
exports.TokensController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const tokens_service_1 = require("./tokens.service");
const user_id_decorator_1 = require("../common/user-id.decorator");
class TradeDto {
}
__decorate([
    (0, class_validator_1.IsIn)(['buy', 'sell']),
    __metadata("design:type", String)
], TradeDto.prototype, "side", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.000001),
    __metadata("design:type", Number)
], TradeDto.prototype, "amount", void 0);
let TokensController = class TokensController {
    constructor(tokens) {
        this.tokens = tokens;
    }
    list() { return this.tokens.list(); }
    detail(t) { return this.tokens.detail(t); }
    candles(t, tf) { return this.tokens.candles(t, tf); }
    holders(t) { return this.tokens.holders(t); }
    trade(t, dto, userId) {
        return this.tokens.trade(t, dto.side, dto.amount, userId);
    }
};
exports.TokensController = TokensController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':ticker'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "detail", null);
__decorate([
    (0, common_1.Get)(':ticker/candles'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Query)('tf')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "candles", null);
__decorate([
    (0, common_1.Get)(':ticker/holders'),
    __param(0, (0, common_1.Param)('ticker')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "holders", null);
__decorate([
    (0, common_1.Post)(':ticker/trade'),
    __param(0, (0, common_1.Param)('ticker')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, TradeDto, String]),
    __metadata("design:returntype", void 0)
], TokensController.prototype, "trade", null);
exports.TokensController = TokensController = __decorate([
    (0, common_1.Controller)('tokens'),
    __metadata("design:paramtypes", [tokens_service_1.TokensService])
], TokensController);
//# sourceMappingURL=tokens.controller.js.map