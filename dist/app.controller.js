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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
let AppController = class AppController {
    health() {
        return { ok: true, service: 'catcheez-backend', milestone: 'M4 + on-chain indexer', fiction: true, ts: new Date().toISOString() };
    }
    root() {
        return {
            service: 'Catcheez M2 API',
            docs: 'README.md 参照',
            endpoints: [
                'POST /api/auth/nonce', 'POST /api/auth/verify',
                'GET /api/funds', 'GET /api/funds/:ticker', 'GET /api/funds/:ticker/cards',
                'GET /api/funds/:ticker/schedule', 'GET /api/funds/:ticker/lottery',
                'POST /api/funds/:ticker/apply', 'POST /api/funds/:ticker/draw',
                'GET /api/tokens', 'GET /api/tokens/:ticker', 'GET /api/tokens/:ticker/candles',
                'GET /api/tokens/:ticker/holders', 'POST /api/tokens/:ticker/trade',
                'GET /api/me/portfolio', 'GET /api/me/wallet', 'GET /api/me/holdings',
                'GET /api/me/tickets', 'GET /api/me/results', 'GET /api/me/transactions', 'GET /api/me/airdrop',
                'GET /api/ranking', 'GET /api/governance', 'POST /api/governance/vote',
            ],
        };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "health", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "root", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map