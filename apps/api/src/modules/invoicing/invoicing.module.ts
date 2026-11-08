import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { VatSummaryService } from './reports/vat-summary.service';
import { VatSummaryController } from './reports/vat-summary.controller';

@Module({
  imports: [CustomersModule, InvoicesModule],
  controllers: [VatSummaryController],
  providers: [VatSummaryService],
})
export class InvoicingModule {}
