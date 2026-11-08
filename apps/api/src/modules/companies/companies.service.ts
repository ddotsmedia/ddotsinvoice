import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { companies, Db, Tx, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { PageQueryDto, requireTenant } from '../../common/tenant';
import { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';
import { seedCompanyDefaults } from '../accounting/accounting.seed';

@Injectable()
export class CompaniesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  list(actor: AccessTokenPayload, q: PageQueryDto) {
    const tenantId = requireTenant(actor.tenantId);
    const where = and(eq(companies.tenantId, tenantId), isNull(companies.deletedAt));
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(companies).where(where).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(companies).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  get(actor: AccessTokenPayload, id: string) {
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, tenantId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateCompanyDto) {
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, async (tx) => {
      const [row] = await tx.insert(companies).values({ ...dto, tenantId }).returning();
      await seedCompanyDefaults(tx, tenantId, row.id);
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateCompanyDto) {
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, tenantId, id);
      const [row] = await tx
        .update(companies)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(companies.id, id))
        .returning();
      return row;
    });
  }

  remove(actor: AccessTokenPayload, id: string) {
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, tenantId, id);
      const [row] = await tx
        .update(companies)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(companies.id, id))
        .returning();
      return row;
    });
  }

  private async find(tx: Tx, tenantId: string, id: string) {
    const [row] = await tx
      .select()
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.tenantId, tenantId), isNull(companies.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Company not found');
    return row;
  }
}
