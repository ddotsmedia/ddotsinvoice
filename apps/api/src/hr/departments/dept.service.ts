import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq } from 'drizzle-orm';
import { departments, Db, Tx, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { CreateDepartmentDto, DepartmentQueryDto, UpdateDepartmentDto } from './dept.dto';

@Injectable()
export class DepartmentsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [d] = await tx.select().from(departments).where(and(eq(departments.id, id), eq(departments.companyId, companyId))).limit(1);
    if (!d) throw new NotFoundException('Department not found');
    return d;
  }

  list(actor: AccessTokenPayload, q: DepartmentQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const where = eq(departments.companyId, companyId);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(departments).where(where).orderBy(asc(departments.code)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(departments).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateDepartmentDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [dup] = await tx.select({ id: departments.id }).from(departments).where(and(eq(departments.companyId, companyId), eq(departments.code, dto.code))).limit(1);
      if (dup) throw new ConflictException('Department code already exists');
      const [row] = await tx.insert(departments).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateDepartmentDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const [row] = await tx.update(departments).set({ ...dto, updatedAt: new Date() }).where(eq(departments.id, id)).returning();
      return row;
    });
  }
}
