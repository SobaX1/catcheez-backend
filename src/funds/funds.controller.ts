import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { FundsService } from './funds.service';
import { UserId } from '../common/user-id.decorator';

class ApplyDto {
  @IsString() tier: string;
  @IsInt() @Min(1) qty: number;
}

@Controller('funds')
export class FundsController {
  constructor(private readonly funds: FundsService) {}

  @Get() list() { return this.funds.list(); }
  @Get(':ticker') detail(@Param('ticker') t: string) { return this.funds.detail(t); }
  @Get(':ticker/cards') cards(@Param('ticker') t: string) { return this.funds.cards(t); }
  @Get(':ticker/schedule') schedule(@Param('ticker') t: string) { return this.funds.schedule(t); }
  @Get(':ticker/lottery') lottery(@Param('ticker') t: string) { return this.funds.lottery(t); }

  @Post(':ticker/apply') apply(@Param('ticker') t: string, @Body() dto: ApplyDto, @UserId() userId: string) {
    return this.funds.apply(t, dto.tier, dto.qty, userId);
  }
  @Post(':ticker/draw') draw(@Param('ticker') t: string) { return this.funds.draw(t); }
}
