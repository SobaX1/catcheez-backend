"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserId = void 0;
const common_1 = require("@nestjs/common");
const seed_1 = require("../db/seed");
exports.UserId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.userId || seed_1.DEMO_USER.id;
});
//# sourceMappingURL=user-id.decorator.js.map