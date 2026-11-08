import { NotFoundException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import {
  Db, goodsReceiptLines, goodsReceiptNotes, inventoryItems, purchaseOrderLines, purchaseOrders, Tx, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextNumber, openFyFor } from '../../modules/accounting/accounting.util';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount, lineCalc, sumM } from '../purchasing.util';
import { stockIn, StockCtx } from '../inventory/inventory.core';
import { CreateGrnDto, GrnQueryDto } from './grn.dto';

const RECEIVABLE_PO = ['approved', 'partially_received'] as const;

@Injectable()
export class GoodsReceiptsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [g] = await tx.select().from(goodsReceiptNotes).where(and(eq(goodsReceiptNotes.id, id), eq(goodsReceiptNotes.companyId, companyId))).limit(1);
    if (!g) throw new NotFoundException('Goods receipt not found');
    return g;
  }

  private lines(tx: Tx, grnId: string) {
    return tx.select().from(goodsReceiptLines).where(eq(goodsReceiptLines.grnId, grnId)).orderBy(asc(goodsReceiptLines.lineNumber));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const g = await this.find(tx, companyId, id);
    return { ...g, lines: await this.lines(tx, id) };
  }

  // Posted GRN qty already received against a PO line
  private async receivedFor(tx: Tx, poLineId: string): Promise<M.Money> {
    const [r] = await tx
      .select({ q: sql<string>`coalesce(sum(${goodsReceiptLines.qtyReceived}),0)` })
      .from(goodsReceiptLines)
      .innerJoin(goodsReceiptNotes, eq(goodsReceiptNotes.id, goodsReceiptLines.grnId))
      .where(and(eq(goodsReceiptLines.poLineId, poLineId), eq(goodsReceiptNotes.status, 'posted')));
    return M.money(r?.q ?? '0');
  }

  async list(actor: AccessTokenPayload, q: GrnQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(goodsReceiptNotes.companyId, companyId)];
    if (q.status) conds.push(eq(goodsReceiptNotes.status, q.status as 'draft' | 'posted' | 'cancelled'));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(goodsReceiptNotes).where(where).orderBy(desc(goodsReceiptNotes.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(goodsReceiptNotes).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateGrnDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      if (dto.poId) {
        const [po] = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, dto.poId), eq(purchaseOrders.companyId, companyId))).limit(1);
        if (!po) throw new NotFoundException('Purchase order not found');
        if (!(RECEIVABLE_PO as readonly string[]).includes(po.status)) {
          throw new UnprocessableEntityException('Purchase order must be approved to receive goods');
        }
        for (const l of dto.lines.filter((x) => x.poLineId)) {
          const [pl] = await tx.select().from(purchaseOrderLines).where(and(eq(purchaseOrderLines.id, l.poLineId!), eq(purchaseOrderLines.poId, po.id))).limit(1);
          if (!pl) throw new UnprocessableEntityException('PO line does not belong to this purchase order');
          const remaining = M.sub(M.money(pl.qty), await this.receivedFor(tx, pl.id));
          if (M.money(l.qtyReceived).greaterThan(remaining)) {
            throw new UnprocessableEntityException(`Received quantity exceeds remaining ${M.toDb(remaining)}`);
          }
        }
      }
      const fy = await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'GRN', dto.date.slice(0, 4));
      const [g] = await tx
        .insert(goodsReceiptNotes)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          poId: dto.poId,
          fiscalYearId: fy.id,
          number,
          date: dto.date,
          notes: dto.notes,
          createdBy: actor.sub,
        })
        .returning();
      await tx.insert(goodsReceiptLines).values(
        dto.lines.map((l, i) => {
          const c = lineCalc(l.qtyReceived, l.unitCost, '0', l.vatRate ?? '5');
          return {
            grnId: g.id,
            tenantId,
            companyId,
            poLineId: l.poLineId,
            lineNumber: i + 1,
            itemId: l.itemId,
            description: l.description,
            qtyReceived: M.toDb(M.money(l.qtyReceived)),
            unitCost: M.toDb(M.money(l.unitCost)),
            vatRate: M.toDb(M.money(l.vatRate ?? '5')),
            vatAmount: M.toDb(c.vat),
            lineTotal: M.toDb(c.total),
            warehouseId: l.warehouseId,
          };
        }),
      );
      return this.load(tx, companyId, g.id);
    });
  }

  post(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const g = await this.find(tx, companyId, id);
      if (g.status !== 'draft') throw new UnprocessableEntityException('Only draft receipts can be posted');
      const rows = await this.lines(tx, id);
      const ctxS: StockCtx = { tenantId, companyId };

      // 1) stock + cost layers
      for (const l of rows.filter((x) => x.itemId)) {
        const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, l.itemId!), eq(inventoryItems.companyId, companyId))).limit(1);
        if (!item) throw new NotFoundException('Inventory item not found');
        await stockIn(
          tx,
          ctxS,
          { itemId: item.id, warehouseId: l.warehouseId, refType: 'grn', refId: g.id, date: g.date, costMethod: item.costMethod },
          { qty: M.money(l.qtyReceived), unitCost: M.money(l.unitCost), type: 'grn_in', grnLineId: l.id },
        );
      }

      // 2) GRNI journal: DR Inventory subtotal, DR VAT input, CR GRNI total
      const calcs = rows.map((l) => lineCalc(l.qtyReceived, l.unitCost, '0', l.vatRate ?? '5'));
      const subtotal = sumM(calcs.map((c) => c.subtotal));
      const vat = sumM(calcs.map((c) => c.vat));
      const inv = await ensureAccount(tx, tenantId, companyId, '1500', 'Inventory', 'asset');
      const vatIn = await ensureAccount(tx, tenantId, companyId, '1310', 'VAT Input Tax', 'asset');
      const grni = await ensureAccount(tx, tenantId, companyId, '2300', 'Goods Received Not Invoiced', 'liability');
      const lines = [{ accountId: inv, debit: M.toDb(subtotal), credit: '0' }];
      if (!vat.isZero()) lines.push({ accountId: vatIn, debit: M.toDb(vat), credit: '0' });
      lines.push({ accountId: grni, debit: '0', credit: M.toDb(M.add(subtotal, vat)) });
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: g.branchId,
        date: g.date,
        description: `GRN ${g.number}`,
        userId: actor.sub,
        lines,
      });

      await tx
        .update(goodsReceiptNotes)
        .set({ status: 'posted', journalEntryId: jeId, updatedAt: new Date() })
        .where(eq(goodsReceiptNotes.id, id));

      // 3) PO receipt status
      if (g.poId) {
        const poLines = await tx.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, g.poId));
        let anyReceived = false;
        let allReceived = true;
        for (const pl of poLines) {
          const rec = await this.receivedFor(tx, pl.id);
          if (rec.greaterThan(0)) anyReceived = true;
          if (rec.lessThan(M.money(pl.qty))) allReceived = false;
        }
        await tx
          .update(purchaseOrders)
          .set({ status: allReceived ? 'fully_received' : anyReceived ? 'partially_received' : 'approved', updatedAt: new Date() })
          .where(eq(purchaseOrders.id, g.poId));
      }
      return this.load(tx, companyId, id);
    });
  }
}
