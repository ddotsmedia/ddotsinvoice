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

  kpis(actor: AccessTokenPayload, fromDate?: string, toDate?: string) {
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

      // ── Extended KPIs ────────────────────────────────────────────────
      const today = todayIso();
      const d30ago = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const d14ahead = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      // Use custom date range if provided, otherwise default to last 30 days
      const rangeFrom = fromDate ?? d30ago;
      const rangeTo = toDate ?? today;

      // Net profit for date range (invoices revenue - supplier invoices expenses)
      const [rev30] = await tx
        .select({ total: sql<string>`coalesce(sum(${invoices.total}),0)` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, ['posted', 'partially_paid', 'paid']), gte(invoices.date, rangeFrom), lte(invoices.date, rangeTo)));
      const [exp30] = await tx
        .select({ total: sql<string>`coalesce(sum(${supplierInvoices.total}),0)` })
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, ['posted', 'partially_paid', 'fully_paid']), gte(supplierInvoices.date, rangeFrom), lte(supplierInvoices.date, rangeTo)));
      const netProfit30 = M.sub(M.money(rev30?.total ?? '0'), M.money(exp30?.total ?? '0'));

      // Cash runway: bank balances + avg monthly expenses
      const bankRows = await tx
        .select({ gl: bankAccounts.glAccountId, nameEn: bankAccounts.nameEn })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.companyId, companyId), eq(bankAccounts.isActive, true)));
      const bankAccList: Array<{ label: string; amount: string }> = [];
      let totalCash = M.money(0);
      for (const b of bankRows) {
        const m = all.get(b.gl);
        const bal = m ? M.sub(m.d, m.c) : M.money(0);
        bankAccList.push({ label: b.nameEn, amount: M.toDb(bal) });
        totalCash = M.add(totalCash, bal);
      }
      // avg monthly expenses last 3 months
      const d3Mago = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const [exp3M] = await tx
        .select({ total: sql<string>`coalesce(sum(${supplierInvoices.total}),0)` })
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, ['posted', 'partially_paid', 'fully_paid']), gte(supplierInvoices.date, d3Mago), lte(supplierInvoices.date, today)));
      const avgMonthlyExp = M.div(M.money(exp3M?.total ?? '0'), M.money(3));
      let runwayWeeks = 520;
      if (M.gt(avgMonthlyExp, M.money(0))) {
        const ratio = totalCash.dividedBy(avgMonthlyExp).toNumber();
        runwayWeeks = Math.min(520, Math.round(ratio * 4.33));
      }

      // Overdue invoices
      const [overdue] = await tx
        .select({ count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${invoices.balanceDue}),0)` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), eq(invoices.status, 'overdue')));

      // Upcoming due in 14 days
      const [upcoming] = await tx
        .select({ count: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${invoices.balanceDue}),0)` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, ['posted', 'partially_paid']), gte(invoices.dueDate, today), lte(invoices.dueDate, d14ahead)));

      // Monthly trend: last 6 calendar months
      const trendMonthly: Array<{ month: string; revenue: string; expenses: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() - i);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth();
        const mFrom = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
        const mTo = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
        const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
        const [mRev] = await tx
          .select({ total: sql<string>`coalesce(sum(${invoices.total}),0)` })
          .from(invoices)
          .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, ['posted', 'partially_paid', 'paid']), gte(invoices.date, mFrom), lte(invoices.date, mTo)));
        const [mExp] = await tx
          .select({ total: sql<string>`coalesce(sum(${supplierInvoices.total}),0)` })
          .from(supplierInvoices)
          .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, ['posted', 'partially_paid', 'fully_paid']), gte(supplierInvoices.date, mFrom), lte(supplierInvoices.date, mTo)));
        trendMonthly.push({ month: monthLabel, revenue: mRev?.total ?? '0', expenses: mExp?.total ?? '0' });
      }

      return {
        receivables: { amount: M.toDb(M.money(ar?.amount ?? '0')), count: ar?.count ?? 0 },
        payables: { amount: M.toDb(M.money(ap?.amount ?? '0')), count: ap?.count ?? 0 },
        cashPosition: { amount: M.toDb(cash) },
        netVat: { amount: M.toDb(M.sub(output, M.money(inp?.vat ?? '0'))), from: range.from, to: range.to },
        recentInvoices: recent,
        netProfitLast30: { amount: M.toDb(netProfit30) },
        cashRunway: { weeks: runwayWeeks, accounts: bankAccList },
        overdueInvoices: { count: overdue?.count ?? 0, totalAmount: M.toDb(M.money(overdue?.total ?? '0')) },
        upcomingDue: { count: upcoming?.count ?? 0, totalAmount: M.toDb(M.money(upcoming?.total ?? '0')) },
        trendMonthly,
      };
    });
  }
}
