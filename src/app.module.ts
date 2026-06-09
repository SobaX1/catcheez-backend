import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { DbModule } from './db/db.module';
import { AppJwtModule } from './common/jwt.module';
import { AuthContextMiddleware } from './common/auth-context.middleware';
import { AuthModule } from './auth/auth.module';
import { FundsModule } from './funds/funds.module';
import { TokensModule } from './tokens/tokens.module';
import { MeModule } from './me/me.module';
import { MiscModule } from './misc/misc.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [DbModule, AppJwtModule, AuthModule, FundsModule, TokensModule, MeModule, MiscModule, SchedulerModule, IndexerModule],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthContextMiddleware).forRoutes('*');
  }
}
