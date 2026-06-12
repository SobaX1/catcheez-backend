import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DEMO_USER } from '../db/seed';

/**
 * Authorization: Bearer <jwt> を検証して req.userId を設定。
 * トークンが無い/無効なら demo-user にフォールバック（M1 モックのフロントが
 * 認証無しでもそのまま動くように）。M3+ で匿名フォールバックを外して保護可能。
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: any, _res: any, next: () => void) {
    let userId = DEMO_USER.id;
    const h = req.headers?.authorization;
    if (typeof h === 'string' && h.startsWith('Bearer ')) {
      try {
        const payload: any = this.jwt.verify(h.slice(7));
        if (payload?.sub) userId = payload.sub;
      } catch {
        /* 無効トークン → demo にフォールバック */
      }
    }
    // JWTなし時: クライアント発行のゲストID（端末単位の軽量ユーザー分離）
    if (userId === DEMO_USER.id) {
      const gid = req.headers?.['x-guest-id'];
      if (typeof gid === 'string' && /^[0-9a-zA-Z-]{8,40}$/.test(gid)) userId = 'g_' + gid;
    }
    req.userId = userId;
    next();
  }
}
