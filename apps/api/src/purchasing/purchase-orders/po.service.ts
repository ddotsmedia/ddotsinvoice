import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { Db, purchaseOrderLines, purchaseOrders, Tx, withTenant, poStatusEnum } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextNumber, openFyFor } from '../../modules/accounting/accounting.util';
import { lineCalc, sumM } from '../purchasing.util';
import { CreatePoDto, PoQueryDto } from './po.dto';

type PoStatus = (typeof poStatusEnum.enumValues)[number];

@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [po] = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId))).limit(1);
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  private lines(tx: Tx, poId: string) {
    return tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId)).orderBy(asc(purchaseOrderLines.lineNumber));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const po = await this.find(tx, companyId, id);
    return { ...po, lines: await this.lines(tx, id) };
  }

  async list(actor: AccessTokenPayload, q: PoQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(purchaseOrders.companyId, companyId)];
    if (q.status) conds.push(eq(purchaseOrders.status, q.status as PoStatus));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(purchaseOrders).where(where).orderBy(desc(purchaseOrders.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(purchaseOrders).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreatePoDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const calcs = dto.lines.map((l) => lineCalc(l.qty, l.unitPrice, l.discount ?? '0', l.vatRate ?? '5'));
      const subtotal = sumM(calcs.map((c) => c.subtotal));
      const vat = sumM(calcs.map((c) => c.vat));
      const fy = await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'PO', dto.date.slice(0, 4));
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          fiscalYearId: fy.id,
          number,
          date: dto.date,
          expectedDeliveryDate: dto.expectedDeliveryDate,
          currencyCode: dto.currencyCode ?? 'AED',
          exchangeRate: dto.exchangeRate ?? '1',
          subtotal: M.toDb(subtotal),
          vatAmount: M.toDb(vat),
          total: M.toDb(M.add(subtotal, vat)),
          notes: dto.notes,
          createdBy: actor.sub,
        })
        .returning();
      await tx.insert(purchaseOrderLines).values(
        dto.lines.map((l, i) => {
          const c = calcs[i];
          return {
            poId: po.id,
            tenantId,
            companyId,
            lineNumber: i + 1,
            itemId: l.itemId,
            description: l.description,
            qty: M.toDb(M.money(l.qty)),
            unitPrice: M.toDb(M.money(l.unitPrice)),
            discount: M.toDb(M.money(l.discount ?? '0')),
            vatRate: M.toDb(M.money(l.vatRate ?? '5')),
            vatAmount: M.toDb(c.vat),
            lineTotal: M.toDb(c.total),
          };
        }),
      );
      return this.load(tx, companyId, po.id);
    });
  }

  private transition(actor: AccessTokenPayload, id: string, from: PoStatus[], to: PoStatus, extra: Record<string, unknown> = {}) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const po = await this.find(tx, companyId, id);
      if (!from.includes(po.status)) throw new UnprocessableEntityException(`Cannot move from ${po.status} to ${to}`);
      await tx.update(purchaseOrders).set({ status: to, updatedAt: new Date(), ...extra }).where(eq(purchaseOrders.id, id));
      return this.load(tx, companyId, id);
    });
  }

  submit(actor: AccessTokenPayload, id: string) {
    return this.transition(actor, id, ['draft'], 'submitted');
  }

  approve(actor: AccessTokenPayload, id: string) {
    if (actor.role !== 'company_admin' && actor.role !== 'branch_manager' && actor.role !== 'tenant_admin' && actor.role !== 'platform_admin') {
      throw new ForbiddenException('Only company admins or branch managers can approve');
    }
    return this.transition(actor, id, ['submitted'], 'approved', { approvedBy: actor.sub, approvedAt: new Date() });
  }

  cancel(actor: AccessTokenPayload, id: string) {
    return this.transition(actor, id, ['draft', 'submitted'], 'cancelled');
  }
}
