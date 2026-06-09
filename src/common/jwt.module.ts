import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-catcheez-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  exports: [JwtModule],
})
export class AppJwtModule {}
