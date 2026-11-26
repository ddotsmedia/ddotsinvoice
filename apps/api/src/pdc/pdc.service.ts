import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { and, eq, gte, ilike, isNull, lte, or, sql } from 'drizzle-orm';
import { pdcCheques, customers, suppliers, Db } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { CreatePdcDto, UpdatePdcStatusDto, PdcQueryDto } from './pdc.dto';

@Injectable()
export class PdcService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { companyId: actor.companyId!, tenantId: actor.tenantId! };
  }

  async list(actor: AccessTokenPayload, q: PdcQueryDto) {
    const { companyId } = this.scope(actor);
    const filters = [eq(pdcCheques.companyId, companyId), isNull(pdcCheques.deletedAt)];
    if (q.type) filters.push(eq(pdcCheques.type, q.type));
    if (q.status) filters.push(eq(pdcCheques.status, q.status));
    if (q.dueDateFrom) filters.push(gte(pdcCheques.dueDate, q.dueDateFrom));
    if (q.dueDateTo) filters.push(lte(pdcCheques.dueDate, q.dueDateTo));
    if (q.search) filters.push(or(
      ilike(pdcCheques.chequeNumber, `%${q.search}%`),
      ilike(pdcCheques.bankName, `%${q.search}%`),
    )!);

    return this.db
      .select({
        id: pdcCheques.id,
        type: pdcCheques.type,
        chequeNumber: pdcCheques.chequeNumber,
        bankName: pdcCheques.bankName,
        amount: pdcCheques.amount,
        currency: pdcCheques.currency,
        dueDate: pdcCheques.dueDate,
        status: pdcCheques.status,
        reference: pdcCheques.reference,
        notes: pdcCheques.notes,
        customerId: pdcCheques.customerId,
        supplierId: pdcCheques.supplierId,
        customerName: customers.name,
        supplierName: suppliers.nameEn,
        createdAt: pdcCheques.createdAt,
      })
      .from(pdcCheques)
      .leftJoin(customers, eq(pdcCheques.customerId, customers.id))
      .leftJoin(suppliers, eq(pdcCheques.supplierId, suppliers.id))
      .where(and(...filters))
      .orderBy(pdcCheques.dueDate);
  }

  async getById(actor: AccessTokenPayload, id: string) {
    const { companyId } = this.scope(actor);
    const rows = await this.db
      .select({
        id: pdcCheques.id,
        type: pdcCheques.type,
        chequeNumber: pdcCheques.chequeNumber,
        bankName: pdcCheques.bankName,
        amount: pdcCheques.amount,
        currency: pdcCheques.currency,
        dueDate: pdcCheques.dueDate,
        status: pdcCheques.status,
        reference: pdcCheques.reference,
        notes: pdcCheques.notes,
        presentedDate: pdcCheques.presentedDate,
        clearedDate: pdcCheques.clearedDate,
        bouncedDate: pdcCheques.bouncedDate,
        bouncedReason: pdcCheques.bouncedReason,
        customerId: pdcCheques.customerId,
        supplierId: pdcCheques.supplierId,
        bankAccountId: pdcCheques.bankAccountId,
        customerName: customers.name,
        supplierName: suppliers.nameEn,
        createdAt: pdcCheques.createdAt,
      })
      .from(pdcCheques)
      .leftJoin(customers, eq(pdcCheques.customerId, customers.id))
      .leftJoin(suppliers, eq(pdcCheques.supplierId, suppliers.id))
      .where(and(eq(pdcCheques.id, id), eq(pdcCheques.companyId, companyId), isNull(pdcCheques.deletedAt)));
    if (!rows[0]) throw new NotFoundException('PDC cheque not found');
    return rows[0];
  }

  async create(actor: AccessTokenPayload, dto: CreatePdcDto) {
    const { companyId, tenantId } = this.scope(actor);
    const [cheque] = await this.db.insert(pdcCheques).values({
      ...dto,
      companyId,
      tenantId,
      amount: String(dto.amount),
      currency: dto.currency ?? 'AED',
    }).returning();
    return cheque;
  }

  async updateStatus(actor: AccessTokenPayload, id: string, dto: UpdatePdcStatusDto) {
    await this.getById(actor, id);
    const [updated] = await this.db.update(pdcCheques).set({ ...dto, updatedAt: new Date() })
      .where(eq(pdcCheques.id, id)).returning();
    return updated;
  }

  async remove(actor: AccessTokenPayload, id: string) {
    await this.getById(actor, id);
    await this.db.update(pdcCheques).set({ deletedAt: new Date() }).where(eq(pdcCheques.id, id));
    return { success: true };
  }

  async summary(actor: AccessTokenPayload) {
    const { companyId } = this.scope(actor);
    const rows = await this.db.select({
      type: pdcCheques.type,
      status: pdcCheques.status,
      count: sql<number>`count(*)::int`,
      total: sql<string>`sum(amount)::text`,
    }).from(pdcCheques)
      .where(and(eq(pdcCheques.companyId, companyId), isNull(pdcCheques.deletedAt)))
      .groupBy(pdcCheques.type, pdcCheques.status);
    return rows;
  }
}
