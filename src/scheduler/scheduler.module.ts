import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AdminController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
