import { Module } from '@nestjs/common';
import { PdcController } from './pdc.controller';
import { PdcService } from './pdc.service';

@Module({
  controllers: [PdcController],
  providers: [PdcService],
})
export class PdcModule {}
