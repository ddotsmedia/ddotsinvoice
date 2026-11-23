import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { Db, tenants } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireTenant } from '../../common/tenant';

const FREE_INVOICE_LIMIT = 5;

@Injectable()
export class SubscriptionService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async getStatus(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    const [row] = await this.db
      .select({ plan: tenants.plan, planExpiresAt: tenants.planExpiresAt, invoiceCountThisMonth: tenants.invoiceCountThisMonth })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const plan = row?.plan ?? 'free';
    const invoiceCountThisMonth = row?.invoiceCountThisMonth ?? 0;
    const invoiceLimit = plan === 'free' ? FREE_INVOICE_LIMIT : null;

    return {
      plan,
      planExpiresAt: row?.planExpiresAt ?? null,
      invoiceCountThisMonth,
      invoiceLimit,
      invoicesRemaining: invoiceLimit !== null ? Math.max(0, invoiceLimit - invoiceCountThisMonth) : null,
    };
  }

  async incrementInvoiceCount(tenantId: string): Promise<void> {
    await this.db
      .update(tenants)
      .set({ invoiceCountThisMonth: sql`${tenants.invoiceCountThisMonth} + 1` })
      .where(eq(tenants.id, tenantId));
  }

  async checkInvoiceLimit(tenantId: string): Promise<{ allowed: boolean; plan: string; used: number; limit: number | null }> {
    const [row] = await this.db
      .select({ plan: tenants.plan, invoiceCountThisMonth: tenants.invoiceCountThisMonth })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const plan = row?.plan ?? 'free';
    const used = row?.invoiceCountThisMonth ?? 0;
    const limit = plan === 'free' ? FREE_INVOICE_LIMIT : null;

    return { allowed: limit === null || used < limit, plan, used, limit };
  }
}
