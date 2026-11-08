import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { accounts, Db, invoice_lines, invoices, journalEntries, journalLines, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';

export interface VatSummaryQuery { dateFrom?: string; dateTo?: string }

@Injectable()
export class VatSummaryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  summary(actor: AccessTokenPayload, q: VatSummaryQuery) {
    const tenantId = requireTenant(actor.tenantId);
    const companyId = requireCompany(actor.companyId);
    const docConds: SQL[] = [
      eq(invoices.companyId, companyId),
      inArray(invoices.status, ['posted', 'paid', 'partially_paid', 'overdue']),
    ];
    if (q.dateFrom) docConds.push(gte(invoices.date, q.dateFrom));
    if (q.dateTo) docConds.push(lte(invoices.date, q.dateTo));

    return withTenant(this.db, tenantId, async (tx) => {
      // Invoices add tax; credit notes subtract it (signed by type)
      const rows = await tx
        .select({
          vatType: invoice_lines.vatType,
          type: invoices.type,
          invoiceId: invoices.id,
          taxable: sql<string>`coalesce(sum(${invoice_lines.lineSubtotal}),0)`,
          vat: sql<string>`coalesce(sum(${invoice_lines.vatAmount}),0)`,
        })
        .from(invoice_lines)
        .innerJoin(invoices, eq(invoices.id, invoice_lines.invoiceId))
        .where(and(...docConds, inArray(invoices.type, ['invoice', 'credit_note'])))
        .groupBy(invoice_lines.vatType, invoices.type, invoices.id);

      const bucket = () => ({ count: new Set<string>(), taxable: M.money(0), vat: M.money(0) });
      const b = { standard: bucket(), zero_rated: bucket(), exempt: bucket() };
      for (const r of rows) {
        const x = b[r.vatType];
        const sign = r.type === 'credit_note' ? -1 : 1;
        x.count.add(r.invoiceId);
        x.taxable = sign > 0 ? M.add(x.taxable, M.money(r.taxable)) : M.sub(x.taxable, M.money(r.taxable));
        x.vat = sign > 0 ? M.add(x.vat, M.money(r.vat)) : M.sub(x.vat, M.money(r.vat));
      }
      const fmt = (x: ReturnType<typeof bucket>) => ({ count: x.count.size, taxableAmount: M.toDb(x.taxable), vatAmount: M.toDb(x.vat) });

      // VAT Payable (2200) from posted/reversed entries in the same date range
      const jConds: SQL[] = [
        eq(journalEntries.companyId, companyId),
        inArray(journalEntries.status, ['posted', 'reversed']),
      ];
      if (q.dateFrom) jConds.push(gte(journalEntries.date, q.dateFrom));
      if (q.dateTo) jConds.push(lte(journalEntries.date, q.dateTo));
      const [vat] = await tx
        .select({
          d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
          c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
        .where(and(...jConds, eq(accounts.code, '2200'), eq(accounts.companyId, companyId)));

      const payable = M.sub(M.money(vat?.c ?? '0'), M.money(vat?.d ?? '0'));
      return {
        standardRated: fmt(b.standard),
        zeroRated: { count: b.zero_rated.count.size, taxableAmount: M.toDb(b.zero_rated.taxable) },
        exempt: { count: b.exempt.count.size, taxableAmount: M.toDb(b.exempt.taxable) },
        totalVatCollected: M.toDb(b.standard.vat),
        vatPayableAccountBalance: M.toDb(payable),
      };
    });
  }
}
