import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import {
  Db, goodsReceiptLines, purchaseOrders, suppliers, supplierInvoiceLines, supplierInvoices, Tx, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextNumber, openFyFor } from '../../modules/accounting/accounting.util';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount, lineCalc, sumM } from '../purchasing.util';
import { CreateSiDto, SiQueryDto } from './si.dto';

@Injectable()
export class SupplierInvoicesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [s] = await tx.select().from(supplierInvoices).where(and(eq(supplierInvoices.id, id), eq(supplierInvoices.companyId, companyId))).limit(1);
    if (!s) throw new NotFoundException('Supplier invoice not found');
    return s;
  }

  private lines(tx: Tx, id: string) {
    return tx.select().from(supplierInvoiceLines).where(eq(supplierInvoiceLines.supplierInvoiceId, id)).orderBy(asc(supplierInvoiceLines.lineNumber));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const s = await this.find(tx, companyId, id);
    return { ...s, lines: await this.lines(tx, id) };
  }

  async list(actor: AccessTokenPayload, q: SiQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(supplierInvoices.companyId, companyId)];
    if (q.status) conds.push(eq(supplierInvoices.status, q.status as 'draft' | 'posted' | 'partially_paid' | 'fully_paid' | 'cancelled'));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(supplierInvoices).where(where).orderBy(desc(supplierInvoices.date)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(supplierInvoices).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateSiDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const calcs = dto.lines.map((l) => lineCalc(l.qty, l.unitPrice, '0', l.vatRate ?? '5'));
      const subtotal = sumM(calcs.map((c) => c.subtotal));
      const vat = sumM(calcs.map((c) => c.vat));
      const total = M.add(subtotal, vat);
      const fy = await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'SINV', dto.date.slice(0, 4));
      const [s] = await tx
        .insert(supplierInvoices)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          supplierId: dto.supplierId,
          grnId: dto.grnId,
          poId: dto.poId,
          fiscalYearId: fy.id,
          number,
          supplierRef: dto.supplierRef,
          date: dto.date,
          dueDate: dto.dueDate,
          subtotal: M.toDb(subtotal),
          vatAmount: M.toDb(vat),
          total: M.toDb(total),
          balanceDue: M.toDb(total),
          createdBy: actor.sub,
        })
        .returning();
      await tx.insert(supplierInvoiceLines).values(
        dto.lines.map((l, i) => ({
          supplierInvoiceId: s.id,
          tenantId,
          companyId,
          lineNumber: i + 1,
          itemId: l.itemId,
          description: l.description,
          qty: M.toDb(M.money(l.qty)),
          unitPrice: M.toDb(M.money(l.unitPrice)),
          vatRate: M.toDb(M.money(l.vatRate ?? '5')),
          vatAmount: M.toDb(calcs[i].vat),
          lineTotal: M.toDb(calcs[i].total),
        })),
      );
      return this.load(tx, companyId, s.id);
    });
  }

  post(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const s = await this.find(tx, companyId, id);
      if (s.status !== 'draft') throw new UnprocessableEntityException('Only draft invoices can be posted');
      const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, s.supplierId)).limit(1);
      await ensureAccount(tx, tenantId, companyId, '2300', 'Goods Received Not Invoiced', 'liability');
      const ap = sup?.defaultApAccountId ?? (await ensureAccount(tx, tenantId, companyId, '2100', 'Accounts Payable', 'liability'));

      // DR GRNI total (VAT already recognised at GRN), CR AP total
      const total = M.money(s.total);
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: s.branchId,
        date: s.date,
        description: `Supplier invoice ${s.number}`,
        userId: actor.sub,
        lines: [
          { accountId: await ensureAccount(tx, tenantId, companyId, '2300', 'Goods Received Not Invoiced', 'liability'), debit: M.toDb(total), credit: '0' },
          { accountId: ap, debit: '0', credit: M.toDb(total) },
        ],
      });
      await tx
        .update(supplierInvoices)
        .set({
          status: 'posted',
          journalEntryId: jeId,
          matchingStatus: s.grnId ? 'matched' : 'unmatched',
          updatedAt: new Date(),
        })
        .where(eq(supplierInvoices.id, id));
      return this.load(tx, companyId, id);
    });
  }

  threeWayMatch(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const s = await this.find(tx, companyId, id);
      const [po] = s.poId ? await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, s.poId)).limit(1) : [];
      const grnLines = s.grnId ? await tx.select().from(goodsReceiptLines).where(eq(goodsReceiptLines.grnId, s.grnId)) : [];
      const grnTotal = s.grnId ? sumM(grnLines.map((l) => M.money(l.lineTotal))) : null;
      const invoiceTotal = M.money(s.total);
      const variance = grnTotal ? M.sub(invoiceTotal, grnTotal) : null;
      const status = !grnTotal || !variance
        ? 'no_grn'
        : variance.isZero() ? 'matched' : variance.greaterThan(0) ? 'over' : 'under';
      return {
        poTotal: po ? M.toDb(M.money(po.total)) : null,
        grnTotal: grnTotal ? M.toDb(grnTotal) : null,
        invoiceTotal: M.toDb(invoiceTotal),
        variance: variance ? M.toDb(variance) : null,
        status,
      };
    });
  }
}
