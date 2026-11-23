import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { CurrentUser } from '../modules/auth/current-user.decorator';
import { FinancialReportsService } from './financial.service';
import { ManagementReportsService, defaultRange } from './management.service';
import { AnalyticsReportsService } from './analytics.service';
import { P2AnalyticsService } from './p2-analytics.service';
import { BudgetsService, CreateBudgetDto, BudgetQueryDto } from './budgets.service';
import { todayIso } from './report.util';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

class RangeQueryDto {
  @IsOptional() @Matches(DATE) fromDate?: string;
  @IsOptional() @Matches(DATE) toDate?: string;
  @IsOptional() @Matches(DATE) asOfDate?: string;
}

class YearQueryDto {
  @IsOptional() @IsInt() @Min(2000) @Max(2100) year?: number;
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class ReportsController {
  constructor(
    private readonly fin: FinancialReportsService,
    private readonly mgmt: ManagementReportsService,
    private readonly analytics: AnalyticsReportsService,
    private readonly p2: P2AnalyticsService,
  ) {}

  @Get('balance-sheet')
  bs(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.fin.balanceSheet(a, q.asOfDate ?? todayIso());
  }

  @Get('income-statement')
  is(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.fin.incomeStatement(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('trial-balance')
  tb(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.fin.trialBalance(a, q.asOfDate ?? todayIso());
  }

  @Get('cash-flow')
  cf(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.fin.cashFlow(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('aging/receivables')
  arAging(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.mgmt.aging(a, 'receivables', q.asOfDate ?? todayIso());
  }

  @Get('aging/payables')
  apAging(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.mgmt.aging(a, 'payables', q.asOfDate ?? todayIso());
  }

  @Get('sales/by-customer')
  byCustomer(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.mgmt.salesByCustomer(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('sales/by-item')
  byItem(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.mgmt.salesByItem(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('purchases/by-supplier')
  bySupplier(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.mgmt.purchasesBySupplier(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('payroll/summary')
  payroll(@CurrentUser() a: AccessTokenPayload, @Query() q: YearQueryDto) {
    return this.mgmt.payrollSummary(a, q.year ?? new Date().getUTCFullYear());
  }

  @Get('dashboard')
  dashboard(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.mgmt.dashboard(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('pl-monthly')
  plMonthly(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.analytics.plMonthly(a, q.toDate ?? todayIso());
  }

  @Get('revenue-breakdown')
  revenueBreakdown(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.analytics.revenueBreakdown(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('invoice-monthly')
  invoiceMonthly(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    return this.analytics.invoiceMonthly(a, q.toDate ?? todayIso());
  }

  @Get('invoice-summary')
  invoiceSummary(@CurrentUser() a: AccessTokenPayload) {
    return this.analytics.invoiceSummary(a);
  }

  @Get('payment-methods')
  paymentMethods(@CurrentUser() a: AccessTokenPayload, @Query() q: RangeQueryDto) {
    const r = defaultRange();
    return this.analytics.paymentMethods(a, q.fromDate ?? r.from, q.toDate ?? r.to);
  }

  @Get('vat-dashboard')
  vatDashboard(@CurrentUser() a: AccessTokenPayload) {
    return this.p2.vatDashboard(a);
  }

  @Get('cash-flow-forecast')
  cashFlowForecast(@CurrentUser() a: AccessTokenPayload) {
    return this.p2.cashFlowForecast(a);
  }

  @Get('customer-analytics')
  customerAnalytics(@CurrentUser() a: AccessTokenPayload) {
    return this.p2.customerAnalytics(a);
  }
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateBudgetDto) {
    return this.budgets.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: BudgetQueryDto) {
    return this.budgets.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.findOne(a, id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.approve(a, id);
  }

  @Post(':id/refresh-actuals')
  refresh(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.refreshActuals(a, id);
  }
}
