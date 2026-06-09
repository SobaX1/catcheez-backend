import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true, service: 'catcheez-backend', milestone: 'M4 + on-chain indexer', fiction: true, ts: new Date().toISOString() };
  }

  @Get()
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
}
