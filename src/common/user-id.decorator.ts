import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEMO_USER } from '../db/seed';

export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  return req.userId || DEMO_USER.id;
});
