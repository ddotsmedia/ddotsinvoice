import { Module } from '@nestjs/common';
import { TelrController } from './telr.controller';
import { TelrService } from './telr.service';

@Module({
  controllers: [TelrController],
  providers: [TelrService],
  exports: [TelrService],
})
export class TelrModule {}
