import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
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
  ],
})
export class AppModule {}
