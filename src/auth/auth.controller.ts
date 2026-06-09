import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';

class NonceDto { @IsString() wallet: string; }
class VerifyDto {
  @IsString() wallet: string;
  @IsString() signature: string; // base58
  @IsString() nonce: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('nonce')
  nonce(@Body() dto: NonceDto) {
    return this.auth.issueNonce(dto.wallet);
  }

  @Post('verify')
  verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.wallet, dto.signature, dto.nonce);
  }
}
