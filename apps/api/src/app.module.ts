import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AdminModule } from './admin/admin.module';
import { DrizzleModule } from './infra/drizzle.module';
import { RedisModule } from './infra/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { PaymentsModule } from './payments/payments.module';
import { HrModule } from './hr/hr.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([
      { name: 'auth-login', ttl: 15 * 60 * 1000, limit: 5 },     // 5 per 15 min (login)
      { name: 'auth-register', ttl: 60 * 60 * 1000, limit: 3 },   // 3 per hour (register)
      { name: 'global', ttl: 60 * 1000, limit: 120 },             // 120 per min everywhere else
    ]),
    DrizzleModule,
    RedisModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    CompaniesModule,
    BranchesModule,
    UsersModule,
    AccountingModule,
    InvoicingModule,
    PurchasingModule,
    PaymentsModule,
    HrModule,
    ReportsModule,
    DashboardModule,
    InvitationsModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
    SuperAdminModule,
    AdminModule,
    SuggestionsModule,
    SubscriptionModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
