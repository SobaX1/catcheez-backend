import { Controller, Get } from '@nestjs/common';
import { MeService } from './me.service';
import { UserId } from '../common/user-id.decorator';

@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('portfolio') portfolio(@UserId() u: string) { return this.me.portfolio(u); }
  @Get('wallet') wallet(@UserId() u: string) { return this.me.wallet(u); }
  @Get('holdings') holdings(@UserId() u: string) { return this.me.holdings(u); }
  @Get('tickets') tickets(@UserId() u: string) { return this.me.tickets(u); }
  @Get('ticket-holdings') ticketHoldings(@UserId() u: string) { return this.me.ticketHoldings(u); }
  @Get('transactions') transactions(@UserId() u: string) { return this.me.transactions(u); }
  @Get('results') results(@UserId() u: string) { return this.me.results(u); }
}
