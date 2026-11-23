import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { bankAccounts, customers, Db, invoices, supplierInvoices, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { movements, todayIso } from '../../reports/report.util';

const OPEN_AR = ['posted', 'partially_paid', 'overdue'] as const;
const OPEN_AP = ['posted', 'partially_paid'] as const;
const VAT_SALES = ['posted', 'paid', 'partially_paid', 'overdue'] as const;
const VAT_PURCHASES = ['posted', 'partially_paid', 'fully_paid'] as const;

// Calendar quarter containing `today` (UAE VAT is filed quarterly)
const quarterRange = (today: string): { from: string; to: string } => {
  const y = Number(today.slice(0, 4));
  const q = Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  const from = new Date(Date.UTC(y, q * 3, 1));
  const to = new Date(Date.UTC(y, q * 3 + 3, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
};

@Injectable()
export class DashboardService {
  constructor(@Inject(DB) private readonly db: Db) {}

  kpis(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    const companyId = requireCompany(actor.companyId);
    const range = quarterRange(todayIso());

    return withTenant(this.db, tenantId, async (tx) => {
      const [ar] = await tx
        .select({ amount: sql<string>`coalesce(sum(${invoices.balanceDue}),0)`, count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_AR])));

      const [ap] = await tx
        .select({ amount: sql<string>`coalesce(sum(${supplierInvoices.balanceDue}),0)`, count: sql<number>`count(*)::int` })
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, [...OPEN_AP])));

      // Cash = net debit balance of the GL accounts linked to bank/cash accounts
      const all = await movements(tx, companyId);
      const banks = await tx.select({ gl: bankAccounts.glAccountId }).from(bankAccounts).where(eq(bankAccounts.companyId, companyId));
      let cash = M.money(0);
      for (const b of banks) {
        const m = all.get(b.gl);
        if (m) cash = M.add(cash, M.sub(m.d, m.c));
      }

      // Net VAT for the current quarter = output VAT (credit notes negative) − input VAT
      const outRows = await tx
        .select({ type: invoices.type, vat: sql<string>`coalesce(sum(${invoices.vatAmount}),0)` })
        .from(invoices)
        .where(and(
          eq(invoices.companyId, companyId),
          inArray(invoices.type, ['invoice', 'credit_note']),
          inArray(invoices.status, [...VAT_SALES]),
          gte(invoices.date, range.from),
          lte(invoices.date, range.to),
        ))
        .groupBy(invoices.type);
      let output = M.money(0);
      for (const r of outRows) output = r.type === 'credit_note' ? M.sub(output, M.money(r.vat)) : M.add(output, M.money(r.vat));
      const [inp] = await tx
        .select({ vat: sql<string>`coalesce(sum(${supplierInvoices.vatAmount}),0)` })
        .from(supplierInvoices)
        .where(and(
          eq(supplierInvoices.companyId, companyId),
          inArray(supplierInvoices.status, [...VAT_PURCHASES]),
          gte(supplierInvoices.date, range.from),
          lte(supplierInvoices.date, range.to),
        ));

      const recent = await tx
        .select({
          id: invoices.id, invoiceNumber: invoices.number, customerName: customers.name,
          total: invoices.total, status: invoices.status, dueDate: invoices.dueDate,
        })
        .from(invoices)
        .innerJoin(customers, eq(customers.id, invoices.customerId))
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice')))
        .orderBy(desc(invoices.createdAt))
        .limit(5);

      return {
        receivables: { amount: M.toDb(M.money(ar?.amount ?? '0')), count: ar?.count ?? 0 },
        payables: { amount: M.toDb(M.money(ap?.amount ?? '0')), count: ap?.count ?? 0 },
        cashPosition: { amount: M.toDb(cash) },
        netVat: { amount: M.toDb(M.sub(output, M.money(inp?.vat ?? '0'))), from: range.from, to: range.to },
        recentInvoices: recent,
      };
    });
  }
}
