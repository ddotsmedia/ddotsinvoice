import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesController } from './invoices.controller';
import { PortalController } from './portal.controller';
import { ExtractController } from './extract.controller';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [InvoicesController, PortalController, ExtractController],
  providers: [InvoicesService, PdfService],
})
export class InvoicesModule {}
