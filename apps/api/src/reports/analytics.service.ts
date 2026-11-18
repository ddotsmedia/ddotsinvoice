import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { accounts, customerPayments, invoices, journalEntries, journalLines, Db, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { todayIso } from './report.util';

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'cheque'] as const;
const POSTED_PAYMENTS = ['posted', 'reconciled'] as const;

/** YYYY-MM-01 for the month `n` months before the month of `date`. */
const monthStart = (date: string, n: number): string => {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1 - n;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

@Injectable()
export class AnalyticsReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  /** Revenue vs expenses per calendar month for the 12 months ending at `toDate` (posted journals). */
  plMonthly(actor: AccessTokenPayload, toDate: string = todayIso()) {
    const { tenantId, companyId } = this.scope(actor);
    const from = monthStart(toDate, 11);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({
          date: journalEntries.date,
          type: accounts.type,
          d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
          c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
        .where(and(
          eq(journalEntries.companyId, companyId),
          inArray(journalEntries.status, ['posted', 'reversed']),
          inArray(accounts.type, ['revenue', 'expense']),
          gte(journalEntries.date, from),
          lte(journalEntries.date, toDate),
        ))
        .groupBy(journalEntries.date, accounts.type);

      const months = Array.from({ length: 12 }, (_, i) => monthStart(toDate, 11 - i).slice(0, 7));
      const byMonth = new Map(months.map((m) => [m, { revenue: M.money(0), expenses: M.money(0) }]));
      for (const r of rows) {
        const bucket = byMonth.get(r.date.slice(0, 7));
        if (!bucket) continue;
        if (r.type === 'revenue') bucket.revenue = M.add(bucket.revenue, M.sub(M.money(r.c), M.money(r.d)));
        else bucket.expenses = M.add(bucket.expenses, M.sub(M.money(r.d), M.money(r.c)));
      }
      return months.map((month) => {
        const b = byMonth.get(month)!;
        return { month, revenue: M.toDb(b.revenue), expenses: M.toDb(b.expenses), netProfit: M.toDb(M.sub(b.revenue, b.expenses)) };
      });
    });
  }

  /** Top 8 revenue accounts by net credit in the range, sorted descending. */
  revenueBreakdown(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({
          accountId: accounts.id,
          code: accounts.code,
          name: accounts.name,
          nameAr: accounts.nameAr,
          d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
          c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
        .where(and(
          eq(journalEntries.companyId, companyId),
          inArray(journalEntries.status, ['posted', 'reversed']),
          eq(accounts.type, 'revenue'),
          gte(journalEntries.date, fromDate),
          lte(journalEntries.date, toDate),
        ))
        .groupBy(accounts.id, accounts.code, accounts.name, accounts.nameAr);

      return rows
        .map((r) => ({
          accountId: r.accountId, code: r.code, nameEn: r.name, nameAr: r.nameAr ?? r.name,
          amount: M.toDb(M.sub(M.money(r.c), M.money(r.d))),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 8);
    });
  }

  /** Customer invoices (type=invoice) grouped into Paid / Outstanding / Overdue / Draft, plus forecast (draft + sent). */
  invoiceSummary(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({ status: invoices.status, total: invoices.total, balanceDue: invoices.balanceDue })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice')));

      const buckets = {
        paid: { count: 0, amount: M.money(0) },
        outstanding: { count: 0, amount: M.money(0) },
        overdue: { count: 0, amount: M.money(0) },
        draft: { count: 0, amount: M.money(0) },
      };
      let forecast = M.money(0);
      const add = (k: keyof typeof buckets, v: string) => {
        buckets[k].count += 1;
        buckets[k].amount = M.add(buckets[k].amount, M.money(v));
      };
      for (const r of rows) {
        if (r.status === 'paid') add('paid', r.total);
        else if (r.status === 'overdue') add('overdue', r.balanceDue);
        else if (r.status === 'draft') add('draft', r.total);
        else if (['sent', 'posted', 'partially_paid'].includes(r.status)) add('outstanding', r.balanceDue);
        if (r.status === 'draft' || r.status === 'sent') forecast = M.add(forecast, M.money(r.total));
      }
      const out = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, { count: v.count, amount: M.toDb(v.amount) }]));
      const totalValue = Object.values(buckets).reduce((s, v) => M.add(s, v.amount), M.money(0));
      return { ...out, totalValue: M.toDb(totalValue), forecast: M.toDb(forecast) };
    });
  }

  /** Per-month invoice figures (by invoice date) for the 12 months ending at `toDate`. */
  invoiceMonthly(actor: AccessTokenPayload, toDate: string = todayIso()) {
    const { tenantId, companyId } = this.scope(actor);
    const from = monthStart(toDate, 11);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({ date: invoices.date, status: invoices.status, total: invoices.total, balanceDue: invoices.balanceDue })
        .from(invoices)
        .where(and(
          eq(invoices.companyId, companyId),
          eq(invoices.type, 'invoice'),
          gte(invoices.date, from),
          lte(invoices.date, toDate),
        ));
      const months = Array.from({ length: 12 }, (_, i) => monthStart(toDate, 11 - i).slice(0, 7));
      const byMonth = new Map(months.map((m) => [m, { invoiced: M.money(0), paid: M.money(0), outstanding: M.money(0) }]));
      for (const r of rows) {
        const b = byMonth.get(r.date.slice(0, 7));
        if (!b || ['draft', 'void', 'converted'].includes(r.status)) continue;
        b.invoiced = M.add(b.invoiced, M.money(r.total));
        if (r.status === 'paid') b.paid = M.add(b.paid, M.money(r.total));
        if (['sent', 'posted', 'partially_paid', 'overdue'].includes(r.status)) b.outstanding = M.add(b.outstanding, M.money(r.balanceDue));
      }
      return months.map((month) => {
        const b = byMonth.get(month)!;
        return { month, invoiced: M.toDb(b.invoiced), paid: M.toDb(b.paid), outstanding: M.toDb(b.outstanding) };
      });
    });
  }

  /** Receipts grouped by payment method for the range (posted/reconciled only). */
  paymentMethods(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({
          method: customerPayments.paymentMethod,
          amount: sql<string>`coalesce(sum(${customerPayments.amount}),0)`,
          count: sql<number>`count(*)::int`,
        })
        .from(customerPayments)
        .where(and(
          eq(customerPayments.companyId, companyId),
          inArray(customerPayments.status, [...POSTED_PAYMENTS]),
          gte(customerPayments.date, fromDate),
          lte(customerPayments.date, toDate),
        ))
        .groupBy(customerPayments.paymentMethod);
      const byMethod = new Map(rows.map((r) => [r.method, r]));
      const items = PAYMENT_METHODS.map((m) => {
        const r = byMethod.get(m);
        return { method: m, count: r?.count ?? 0, amount: M.toDb(M.money(r?.amount ?? 0)) };
      });
      const total = items.reduce((s, i) => M.add(s, M.money(i.amount)), M.money(0));
      return { items, total: M.toDb(total) };
    });
  }
}
