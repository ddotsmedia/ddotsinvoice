import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { Db, suppliers, Tx, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [s] = await tx.select().from(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId))).limit(1);
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async list(actor: AccessTokenPayload, q: SupplierQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(suppliers.companyId, companyId)];
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(ilike(suppliers.nameEn, s), ilike(suppliers.nameAr, s), ilike(suppliers.code, s))!);
    }
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(suppliers).where(where).orderBy(suppliers.code).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(suppliers).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateSupplierDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [dup] = await tx.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.companyId, companyId), eq(suppliers.code, dto.code))).limit(1);
      if (dup) throw new ConflictException('Supplier code already exists');
      const [row] = await tx.insert(suppliers).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateSupplierDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const [row] = await tx.update(suppliers).set({ ...dto, updatedAt: new Date() }).where(eq(suppliers.id, id)).returning();
      return row;
    });
  }
}
