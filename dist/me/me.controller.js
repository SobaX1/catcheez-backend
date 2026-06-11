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
exports.MeController = void 0;
const common_1 = require("@nestjs/common");
const me_service_1 = require("./me.service");
const user_id_decorator_1 = require("../common/user-id.decorator");
let MeController = class MeController {
    constructor(me) {
        this.me = me;
    }
    portfolio(u) { return this.me.portfolio(u); }
    wallet(u) { return this.me.wallet(u); }
    holdings(u) { return this.me.holdings(u); }
    tickets(u) { return this.me.tickets(u); }
    ticketHoldings(u) { return this.me.ticketHoldings(u); }
    transactions(u) { return this.me.transactions(u); }
    results(u) { return this.me.results(u); }
};
exports.MeController = MeController;
__decorate([
    (0, common_1.Get)('portfolio'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "portfolio", null);
__decorate([
    (0, common_1.Get)('wallet'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "wallet", null);
__decorate([
    (0, common_1.Get)('holdings'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "holdings", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "tickets", null);
__decorate([
    (0, common_1.Get)('ticket-holdings'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "ticketHoldings", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "transactions", null);
__decorate([
    (0, common_1.Get)('results'),
    __param(0, (0, user_id_decorator_1.UserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MeController.prototype, "results", null);
exports.MeController = MeController = __decorate([
    (0, common_1.Controller)('me'),
    __metadata("design:paramtypes", [me_service_1.MeService])
], MeController);
//# sourceMappingURL=me.controller.js.map