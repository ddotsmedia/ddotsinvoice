import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  accounts, bankAccounts, customers, Db, invoice_lines, invoices, journalEntries, journalLines, payrollLines, payrollRuns,
  suppliers, supplierInvoices, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { accountsById, daysBetween, movements, todayIso } from './report.util';

const OPEN_SALES = ['posted', 'paid', 'partially_paid', 'overdue'] as const;
const OPEN_AR = ['posted', 'partially_paid', 'overdue'] as const;
const OPEN_AP = ['posted', 'partially_paid'] as const;

// Age buckets by days past due
const bucketOf = (days: number): 'current' | 'd31_60' | 'd61_90' | 'd91_120' | 'd120plus' =>
  days <= 30 ? 'current' : days <= 60 ? 'd31_60' : days <= 90 ? 'd61_90' : days <= 120 ? 'd91_120' : 'd120plus';

@Injectable()
export class ManagementReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  // Receivables (customers) or payables (suppliers) aged by days past due
  aging(actor: AccessTokenPayload, kind: 'receivables' | 'payables', asOfDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const isAR = kind === 'receivables';
      const docs = isAR
        ? await tx.select().from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_AR])))
        : await tx.select().from(supplierInvoices).where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, [...OPEN_AP])));
      const parties = isAR
        ? new Map((await tx.select().from(customers).where(eq(customers.companyId, companyId))).map((p) => [p.id, p]))
        : new Map((await tx.select().from(suppliers).where(eq(suppliers.companyId, companyId))).map((p) => [p.id, p]));
      type Row = { partyId: string; nameEn: string; nameAr: string; current: M.Money; d31_60: M.Money; d61_90: M.Money; d91_120: M.Money; d120plus: M.Money; total: M.Money };
      const rows = new Map<string, Row>();
      const zero = () => ({ current: M.money(0), d31_60: M.money(0), d61_90: M.money(0), d91_120: M.money(0), d120plus: M.money(0), total: M.money(0) });
      for (const d of docs) {
        const bal = M.money(d.balanceDue);
        if (bal.lessThanOrEqualTo(0)) continue;
        const partyId = isAR ? (d as { customerId: string }).customerId : (d as { supplierId: string }).supplierId;
        const party = parties.get(partyId) as { nameEn?: string; name?: string; nameAr?: string | null } | undefined;
        const row: Row = rows.get(partyId) ?? { ...zero(), partyId, nameEn: party?.nameEn ?? party?.name ?? '', nameAr: party?.nameAr ?? '' };
        const b = bucketOf(daysBetween(d.dueDate ?? d.date, asOfDate));
        row[b] = M.add(row[b], bal);
        row.total = M.add(row.total, bal);
        rows.set(partyId, row);
      }
      const out = [...rows.values()].map((r) => ({
        partyId: r.partyId, nameEn: r.nameEn, nameAr: r.nameAr,
        current: M.toDb(r.current), d31_60: M.toDb(r.d31_60), d61_90: M.toDb(r.d61_90), d91_120: M.toDb(r.d91_120), d120plus: M.toDb(r.d120plus), total: M.toDb(r.total),
      }));
      const totals = out.reduce((t, r) => {
        for (const k of ['current', 'd31_60', 'd61_90', 'd91_120', 'd120plus', 'total'] as const) t[k] = M.add(t[k] ?? M.money(0), M.money(r[k]));
        return t;
      }, {} as Record<string, M.Money>);
      return { asOfDate, rows: out, totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, M.toDb(v)])) };
    });
  }

  salesByCustomer(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const docs = await tx
        .select()
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_SALES]), gte(invoices.date, fromDate), lte(invoices.date, toDate)));
      const names = new Map((await tx.select().from(customers).where(eq(customers.companyId, companyId))).map((c) => [c.id, c]));
      const agg = new Map<string, { total: M.Money; count: number }>();
      for (const d of docs) {
        const a = agg.get(d.customerId) ?? { total: M.money(0), count: 0 };
        agg.set(d.customerId, { total: M.add(a.total, M.money(d.total)), count: a.count + 1 });
      }
      return [...agg]
        .map(([id, a]) => ({ customerId: id, nameEn: names.get(id)?.name ?? '', nameAr: names.get(id)?.nameAr ?? '', totalAmount: M.toDb(a.total), invoiceCount: a.count, _t: a.total }))
        .sort((x, y) => M.money(y.totalAmount).comparedTo(M.money(x.totalAmount)))
        .map(({ _t, ...r }) => { void _t; return r; });
    });
  }

  // Invoice lines grouped by description (lines carry no item id)
  salesByItem(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({ description: invoice_lines.description, descriptionAr: invoice_lines.descriptionAr, qty: invoice_lines.quantity, total: invoice_lines.lineSubtotal })
        .from(invoice_lines)
        .innerJoin(invoices, eq(invoices.id, invoice_lines.invoiceId))
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_SALES]), gte(invoices.date, fromDate), lte(invoices.date, toDate)));
      const agg = new Map<string, { nameAr: string | null; qty: M.Money; total: M.Money }>();
      for (const r of rows) {
        const a = agg.get(r.description) ?? { nameAr: r.descriptionAr, qty: M.money(0), total: M.money(0) };
        agg.set(r.description, { nameAr: a.nameAr, qty: M.add(a.qty, M.money(r.qty)), total: M.add(a.total, M.money(r.total)) });
      }
      return [...agg]
        .map(([name, a]) => ({
          itemId: null, nameEn: name, nameAr: a.nameAr ?? '', qty: M.toDb(a.qty), totalAmount: M.toDb(a.total),
          avgPrice: a.qty.isZero() ? '0' : M.toDb(M.div(a.total, a.qty)),
        }))
        .sort((x, y) => M.money(y.totalAmount).comparedTo(M.money(x.totalAmount)));
    });
  }

  purchasesBySupplier(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const docs = await tx
        .select()
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, ['posted', 'partially_paid', 'fully_paid']), gte(supplierInvoices.date, fromDate), lte(supplierInvoices.date, toDate)));
      const names = new Map((await tx.select().from(suppliers).where(eq(suppliers.companyId, companyId))).map((s) => [s.id, s]));
      const agg = new Map<string, { total: M.Money; count: number }>();
      for (const d of docs) {
        const a = agg.get(d.supplierId) ?? { total: M.money(0), count: 0 };
        agg.set(d.supplierId, { total: M.add(a.total, M.money(d.total)), count: a.count + 1 });
      }
      return [...agg]
        .map(([id, a]) => ({ supplierId: id, nameEn: names.get(id)?.nameEn ?? '', nameAr: names.get(id)?.nameAr ?? '', totalAmount: M.toDb(a.total), invoiceCount: a.count }))
        .sort((x, y) => M.money(y.totalAmount).comparedTo(M.money(x.totalAmount)));
    });
  }

  payrollSummary(actor: AccessTokenPayload, year: number) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const runs = await tx
        .select()
        .from(payrollRuns)
        .where(and(eq(payrollRuns.companyId, companyId), eq(payrollRuns.periodYear, year), inArray(payrollRuns.status, ['approved', 'paid'])));
      const out = [];
      for (const r of runs.sort((a, b) => a.periodMonth - b.periodMonth)) {
        const [{ hc }] = await tx.select({ hc: sql<number>`count(*)::int` }).from(payrollLines).where(eq(payrollLines.payrollRunId, r.id));
        out.push({ month: r.periodMonth, totalGross: r.totalGross, totalDeductions: r.totalDeductions, totalNet: r.totalNet, headcount: hc });
      }
      return out;
    });
  }

  dashboard(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const mv = await movements(tx, companyId, fromDate, toDate);
      const accts = await accountsById(tx, companyId);
      let revenue = M.money(0), expenses = M.money(0);
      for (const [id, m] of mv) {
        const a = accts.get(id);
        if (a?.type === 'revenue') revenue = M.add(revenue, M.sub(m.c, m.d));
        if (a?.type === 'expense') expenses = M.add(expenses, M.sub(m.d, m.c));
      }
      const netProfit = M.sub(revenue, expenses);

      const ar = await tx.select().from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_AR])));
      const ap = await tx.select().from(supplierInvoices).where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, [...OPEN_AP])));
      const receivables = ar.reduce((s, d) => M.add(s, M.money(d.balanceDue)), M.money(0));
      const payables = ap.reduce((s, d) => M.add(s, M.money(d.balanceDue)), M.money(0));

      const all = await movements(tx, companyId);
      const banks = await tx.select().from(bankAccounts).where(eq(bankAccounts.companyId, companyId));
      let cash = M.money(0);
      for (const b of banks) {
        const m = all.get(b.glAccountId);
        if (m) cash = M.add(cash, M.sub(m.d, m.c));
      }

      const topCustomers = (await this.salesByCustomer(actor, fromDate, toDate)).slice(0, 5);

      // Revenue per month for the 12 months ending at toDate
      const start = `${Number(toDate.slice(0, 4)) - (Number(toDate.slice(5, 7)) <= 12 ? 1 : 0)}-${toDate.slice(5, 7)}-01`;
      const monthRows = await tx
        .select({
          date: journalEntries.date,
          d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
          c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
        .where(and(eq(journalEntries.companyId, companyId), inArray(journalEntries.status, ['posted', 'reversed']), eq(accounts.type, 'revenue'), gte(journalEntries.date, start), lte(journalEntries.date, toDate)))
        .groupBy(journalEntries.date);
      const byMonth = new Map<string, M.Money>();
      for (const r of monthRows) {
        const k = r.date.slice(0, 7);
        byMonth.set(k, M.add(byMonth.get(k) ?? M.money(0), M.sub(M.money(r.c), M.money(r.d))));
      }
      const revenueByMonth = [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, revenue: M.toDb(v) }));

      return {
        fromDate, toDate,
        totalRevenue: M.toDb(revenue),
        totalExpenses: M.toDb(expenses),
        netProfit: M.toDb(netProfit),
        outstandingReceivables: M.toDb(receivables),
        outstandingPayables: M.toDb(payables),
        cashBalance: M.toDb(cash),
        topCustomers,
        revenueByMonth,
      };
    });
  }
}

export const defaultRange = (year?: number): { from: string; to: string } => {
  const y = year ?? new Date().getUTCFullYear();
  return { from: `${y}-01-01`, to: todayIso().startsWith(String(y)) ? todayIso() : `${y}-12-31` };
};
