import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { FiscalYearsModule } from './fiscal-years/fiscal-years.module';
import { JournalsModule } from './journals/journals.module';
import { ReportsModule } from './reports/reports.module';

@Module({ imports: [AccountsModule, FiscalYearsModule, JournalsModule, ReportsModule] })
export class AccountingModule {}
