import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// JwtModule は AppJwtModule(@Global) から供給される
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
