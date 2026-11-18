import { Module } from '@nestjs/common';
import { FinancialReportsService } from './financial.service';
import { ManagementReportsService } from './management.service';
import { BudgetsService } from './budgets.service';
import { AnalyticsReportsService } from './analytics.service';
import { BudgetsController, ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController, BudgetsController],
  providers: [FinancialReportsService, ManagementReportsService, AnalyticsReportsService, BudgetsService],
})
export class ReportsModule {}
