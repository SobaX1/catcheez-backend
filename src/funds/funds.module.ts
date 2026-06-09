import { Module } from '@nestjs/common';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';
import { WinnersController } from './winners.controller';
import { WinnersService } from './winners.service';

@Module({
  controllers: [FundsController, WinnersController],
  providers: [FundsService, WinnersService],
})
export class FundsModule {}
