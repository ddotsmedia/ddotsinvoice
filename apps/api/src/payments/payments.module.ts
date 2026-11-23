import { Module } from '@nestjs/common';
import { TelrModule } from './telr/telr.module';
import { BankAccountsController } from './bank-accounts/bank-accounts.controller';
import { BankAccountsService } from './bank-accounts/bank-accounts.service';
import { CustomerPaymentsController } from './customer-payments/cp.controller';
import { CustomerPaymentsService } from './customer-payments/cp.service';
import { SupplierPaymentsController } from './supplier-payments/sp.controller';
import { SupplierPaymentsService } from './supplier-payments/sp.service';
import { BankTransactionsController } from './bank-transactions/bt.controller';
import { BankTransactionsService } from './bank-transactions/bt.service';
import { ReconciliationsController } from './reconciliations/rec.controller';
import { ReconciliationsService } from './reconciliations/rec.service';

@Module({
  imports: [TelrModule],
  controllers: [
    BankAccountsController,
    CustomerPaymentsController,
    SupplierPaymentsController,
    BankTransactionsController,
    ReconciliationsController,
  ],
  providers: [
    BankAccountsService,
    CustomerPaymentsService,
    SupplierPaymentsService,
    BankTransactionsService,
    ReconciliationsService,
  ],
})
export class PaymentsModule {}
