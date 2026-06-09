import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsNumber, Min } from 'class-validator';
import { TokensService } from './tokens.service';
import { UserId } from '../common/user-id.decorator';

class TradeDto {
  @IsIn(['buy', 'sell']) side: 'buy' | 'sell';
  @IsNumber() @Min(0.000001) amount: number;
}

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @Get() list() { return this.tokens.list(); }
  @Get(':ticker') detail(@Param('ticker') t: string) { return this.tokens.detail(t); }
  @Get(':ticker/candles') candles(@Param('ticker') t: string, @Query('tf') tf?: string) { return this.tokens.candles(t, tf); }
  @Get(':ticker/holders') holders(@Param('ticker') t: string) { return this.tokens.holders(t); }

  @Post(':ticker/trade') trade(@Param('ticker') t: string, @Body() dto: TradeDto, @UserId() userId: string) {
    return this.tokens.trade(t, dto.side, dto.amount, userId);
  }
}
