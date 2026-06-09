import { Body, Controller, ForbiddenException, Post } from '@nestjs/common';
import { IsObject, IsString } from 'class-validator';
import { IndexerService } from './indexer.service';

class EventDto {
  @IsString() name: string;
  @IsObject() data: Record<string, any>;
}

/** プロトタイプ用: 合成イベントを投入して DB 反映を確認（ALLOW_ADMIN=false で無効）。 */
@Controller('admin/indexer')
export class IndexerController {
  constructor(private readonly indexer: IndexerService) {}

  @Post('event')
  event(@Body() dto: EventDto) {
    if (process.env.ALLOW_ADMIN === 'false') throw new ForbiddenException('admin は無効です');
    return this.indexer.apply(dto.name, dto.data);
  }
}
