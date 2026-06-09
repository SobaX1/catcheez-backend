import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { WinnersService } from './winners.service';

class DrawWinnersDto {
  @IsString() randomness: string; // 32byte hex（0x可）。Drawn イベントの randomness
  @IsInt() @Min(1) slots: number; // 当選枠（winner_slots）
}

@Controller('funds')
export class WinnersController {
  constructor(private readonly winners: WinnersService) {}

  // 運用者(authority)専用：当選者確定＋proof保存。ALLOW_ADMIN=false で無効。
  @Post(':ticker/draw-winners')
  drawWinners(@Param('ticker') ticker: string, @Body() dto: DrawWinnersDto) {
    if (process.env.ALLOW_ADMIN === 'false') throw new ForbiddenException('admin は無効です');
    return this.winners.drawWinners(ticker, dto.randomness, dto.slots);
  }

  // フロント公開：owner が当選者なら proof を返す。?owner=<pubkey>
  @Get(':ticker/proof')
  proof(@Param('ticker') ticker: string, @Query('owner') owner: string) {
    return this.winners.proof(ticker, owner);
  }
}
