import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { branches, Db, Tx, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { PageQueryDto, requireCompany, requireTenant } from '../../common/tenant';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';

@Injectable()
export class BranchesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    const companyId = requireCompany(actor.companyId);
    const where = and(eq(branches.tenantId, tenantId), eq(branches.companyId, companyId), isNull(branches.deletedAt));
    return { tenantId, companyId, where };
  }

  list(actor: AccessTokenPayload, q: PageQueryDto) {
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(branches).where(where).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(branches).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  get(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, tenantId, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateBranchDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [row] = await tx.insert(branches).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateBranchDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, tenantId, companyId, id);
      const [row] = await tx
        .update(branches)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();
      return row;
    });
  }

  remove(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, tenantId, companyId, id);
      const [row] = await tx
        .update(branches)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(branches.id, id))
        .returning();
      return row;
    });
  }

  private async find(tx: Tx, tenantId: string, companyId: string, id: string) {
    const [row] = await tx
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.tenantId, tenantId),
          eq(branches.companyId, companyId),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Branch not found');
    return row;
  }
}
