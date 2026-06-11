import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ScanService } from './scan.service';
import { UserId } from '../common/user-id.decorator';

/** Photo to Earn — Step1 エンドポイント（/api 直下） */
@Controller()
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  @Get('points') points(@UserId() u: string) { return this.scan.points(u); }
  @Get('points/ledger') ledger(@UserId() u: string, @Query('limit') limit?: string) {
    return this.scan.ledger(u, limit ? parseInt(limit, 10) : 30);
  }
  @Get('collection') collection(@UserId() u: string) { return this.scan.collection(u); }

  /** POST /api/scan — mockモード（画像不要。{demo:true} などのJSONを受理） */
  @Post('scan') postScan(@UserId() u: string, @Body() body: any) {
    return this.scan.scan(u, !!body?.demo, typeof body?.image === 'string' && body.image.length > 50 ? body.image : undefined);
  }

  /** POST /api/points/redeem — CZPでIPOチケット交換 {ticker, tier, qty} */
  @Post('points/redeem') redeem(@UserId() u: string, @Body() body: any) {
    return this.scan.redeem(u, body?.ticker, body?.tier, Number(body?.qty));
  }

  /** 開発用: デモデータ投入（冪等）。本番では ALLOW_ADMIN ガードに載せ替え予定 */
  @Post('points/seed-demo') seedDemo(@UserId() u: string) { return this.scan.seedDemo(u); }
}
