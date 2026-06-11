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
exports.IndexerController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const indexer_service_1 = require("./indexer.service");
class EventDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EventDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], EventDto.prototype, "data", void 0);
/** プロトタイプ用: 合成イベントを投入して DB 反映を確認（ALLOW_ADMIN=false で無効）。 */
let IndexerController = class IndexerController {
    constructor(indexer) {
        this.indexer = indexer;
    }
    event(dto) {
        if (process.env.ALLOW_ADMIN === 'false')
            throw new common_1.ForbiddenException('admin は無効です');
        return this.indexer.apply(dto.name, dto.data);
    }
};
exports.IndexerController = IndexerController;
__decorate([
    (0, common_1.Post)('event'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EventDto]),
    __metadata("design:returntype", void 0)
], IndexerController.prototype, "event", null);
exports.IndexerController = IndexerController = __decorate([
    (0, common_1.Controller)('admin/indexer'),
    __metadata("design:paramtypes", [indexer_service_1.IndexerService])
], IndexerController);
//# sourceMappingURL=indexer.controller.js.map