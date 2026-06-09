import { Body, Controller, ForbiddenException, Param, Post } from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import { DbService } from '../db/db.service';
import { SchedulerService } from './scheduler.service';

/**
 * プロトタイプ専用の管理エンドポイント（締切などを決定的にテストするため）。
 * ALLOW_ADMIN=false で無効化。本番では必ず無効化 or 認可を付与すること。
 */
class ExpireDto { @IsOptional() @IsBoolean() meetGoal?: boolean; }

@Controller('admin')
export class AdminController {
  constructor(private readonly db: DbService, private readonly scheduler: SchedulerService) {}

  private guard() {
    if (process.env.ALLOW_ADMIN === 'false') throw new ForbiddenException('admin は無効です');
  }

  @Post('tick')
  tick() { this.guard(); return this.scheduler.tick(); }

  // 募集締切を過去にする。meetGoal=true なら達成済み(raised=goal)に、false/未指定なら未達のまま。
  @Post('funds/:ticker/expire')
  expire(@Param('ticker') ticker: string, @Body() dto: ExpireDto) {
    this.guard();
    const past = new Date(Date.now() - 1000).toISOString();
    if (dto?.meetGoal) {
      this.db.run(`UPDATE fund SET deadline=?, status='open', raised_usdc=goal_usdc, pct=100 WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
    } else {
      this.db.run(`UPDATE fund SET deadline=?, status='open' WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
    }
    this.db.save();
    return { ok: true, ticker, deadline: past, meetGoal: !!dto?.meetGoal };
  }

  // 抽選期日を過去にする（locked にして自動抽選を起こす）
  @Post('funds/:ticker/force-draw-due')
  forceDrawDue(@Param('ticker') ticker: string) {
    this.guard();
    const past = new Date(Date.now() - 1000).toISOString();
    this.db.run(`UPDATE fund SET status='locked', draw_at=? WHERE ticker=? COLLATE NOCASE`, [past, ticker]);
    this.db.save();
    return { ok: true, ticker, drawAt: past };
  }

  // 指定カードの公開時刻を過去にする（時限公開をテスト）
  @Post('funds/:ticker/reveal/:idx')
  reveal(@Param('ticker') ticker: string, @Param('idx') idx: string) {
    this.guard();
    const past = new Date(Date.now() - 1000).toISOString();
    this.db.run(`UPDATE fund_card SET reveal_at=? WHERE fund_ticker=? COLLATE NOCASE AND idx=?`, [past, ticker, Number(idx)]);
    this.db.save();
    return { ok: true, ticker, idx: Number(idx) };
  }
}
