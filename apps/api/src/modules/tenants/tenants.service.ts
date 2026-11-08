import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { Db, tenants } from '@ddotsinvoice/db';
import { ADMIN_DB } from '../../infra/drizzle.module';
import { PageQueryDto } from '../../common/tenant';
import { CreateTenantDto, UpdateTenantDto } from './tenants.dto';

const alive = isNull(tenants.deletedAt);

@Injectable()
export class TenantsService {
  constructor(@Inject(ADMIN_DB) private readonly db: Db) {}

  async list(q: PageQueryDto) {
    const items = await this.db.select().from(tenants).where(alive).limit(q.limit).offset((q.page - 1) * q.limit);
    const [{ total }] = await this.db.select({ total: count() }).from(tenants).where(alive);
    return { items, total, page: q.page, limit: q.limit };
  }

  async get(id: string) {
    const [row] = await this.db.select().from(tenants).where(and(eq(tenants.id, id), alive)).limit(1);
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  async create(dto: CreateTenantDto) {
    const [row] = await this.db.insert(tenants).values(dto).returning();
    return row;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const [row] = await this.db
      .update(tenants)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(tenants.id, id), alive))
      .returning();
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  async remove(id: string) {
    const [row] = await this.db
      .update(tenants)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(tenants.id, id), alive))
      .returning();
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }
}
