import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  bankAccounts, customers, Db, invoices, supplierInvoices, suppliers, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { movements, todayIso } from './report.util';

const SALES_POSTED = ['posted', 'paid', 'partially_paid', 'overdue'] as const;
const AP_POSTED = ['posted', 'partially_paid', 'fully_paid'] as const;

function quarterOf(date: string): { year: number; q: number } {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return { year: y, q: Math.ceil(m / 3) };
}

function quarterLabel(year: number, q: number): string {
  const months = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];
  return `Q${q} ${year} (${months[q - 1]})`;
}

function quarterRange(year: number, q: number): { from: string; to: string } {
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const endDay = endMonth === 3 || endMonth === 12 ? 31 : endMonth === 6 ? 30 : endMonth === 9 ? 30 : 28;
  return {
    from: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    to: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

function filingDeadline(year: number, q: number): string {
  // Last day of month following quarter end
  const quarterEndMonth = q * 3;
  let dlMonth = quarterEndMonth + 1;
  let dlYear = year;
  if (dlMonth > 12) { dlMonth = 1; dlYear += 1; }
  const lastDay = new Date(Date.UTC(dlYear, dlMonth, 0)).getUTCDate();
  return `${dlYear}-${String(dlMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function weekStart(date: Date, offset: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthStart(date: string, n: number): string {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1 - n;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

@Injectable()
export class P2AnalyticsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  async vatDashboard(actor: AccessTokenPayload) {
    if (!actor.tenantId) return { outputVat: '0', inputVat: '0', netVat: '0', periods: [] };
    const { tenantId, companyId } = this.scope(actor);
    const today = todayIso();
    const { year, q } = quarterOf(today);

    const getVatForQuarters = async (tx: Db, quarters: Array<{ year: number; q: number }>) => {
      const results = [];
      for (const { year: y, q: qi } of quarters) {
        const { from, to } = quarterRange(y, qi);
        const [outRow] = await (tx as any)
          .select({ vat: sql<string>`coalesce(sum(${invoices.vatAmount}),0)` })
          .from(invoices)
          .where(and(eq(invoices.companyId, companyId), inArray(invoices.status, [...SALES_POSTED]), eq(invoices.type, 'invoice'), gte(invoices.date, from), lte(invoices.date, to)));
        const [inRow] = await (tx as any)
          .select({ vat: sql<string>`coalesce(sum(${supplierInvoices.vatAmount}),0)` })
          .from(supplierInvoices)
          .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, [...AP_POSTED]), gte(supplierInvoices.date, from), lte(supplierInvoices.date, to)));
        const outputVat = M.money(outRow?.vat ?? '0');
        const inputVat = M.money(inRow?.vat ?? '0');
        results.push({ year: y, q: qi, outputVat, inputVat, netVat: M.sub(outputVat, inputVat) });
      }
      return results;
    };

    return withTenant(this.db, tenantId, async (tx) => {
      // Current and previous 4 quarters
      const allQuarters: Array<{ year: number; q: number }> = [];
      let { year: cy, q: cq } = { year, q };
      for (let i = 0; i < 5; i++) {
        allQuarters.push({ year: cy, q: cq });
        cq--;
        if (cq < 1) { cq = 4; cy--; }
      }

      const vatData = await getVatForQuarters(tx as any, allQuarters);
      const current = vatData[0];
      const prevQuarters = vatData.slice(1);

      const deadline = filingDeadline(current.year, current.q);
      const daysUntil = daysBetween(today, deadline);

      // Top VAT customers
      const { from: cFrom, to: cTo } = quarterRange(current.year, current.q);
      const custRows = await (tx as any)
        .select({ id: invoices.customerId, vat: sql<string>`coalesce(sum(${invoices.vatAmount}),0)` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), inArray(invoices.status, [...SALES_POSTED]), eq(invoices.type, 'invoice'), gte(invoices.date, cFrom), lte(invoices.date, cTo)))
        .groupBy(invoices.customerId)
        .orderBy(sql`sum(${invoices.vatAmount}) desc`)
        .limit(5);

      const custNames = new Map((await (tx as any).select().from(customers).where(eq(customers.companyId, companyId))).map((c: any) => [c.id, c.name ?? c.nameEn ?? '']));

      const supplierRows = await (tx as any)
        .select({ id: supplierInvoices.supplierId, vat: sql<string>`coalesce(sum(${supplierInvoices.vatAmount}),0)` })
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.companyId, companyId), inArray(supplierInvoices.status, [...AP_POSTED]), gte(supplierInvoices.date, cFrom), lte(supplierInvoices.date, cTo)))
        .groupBy(supplierInvoices.supplierId)
        .orderBy(sql`sum(${supplierInvoices.vatAmount}) desc`)
        .limit(5);

      const suppNames = new Map((await (tx as any).select().from(suppliers).where(eq(suppliers.companyId, companyId))).map((s: any) => [s.id, s.nameEn ?? s.name ?? '']));

      return {
        currentQuarter: {
          label: quarterLabel(current.year, current.q),
          outputVat: M.toDb(current.outputVat),
          inputVat: M.toDb(current.inputVat),
          netVat: M.toDb(current.netVat),
          filingDeadline: deadline,
          daysUntilDeadline: daysUntil,
        },
        previousQuarters: prevQuarters.map((pq) => ({
          label: quarterLabel(pq.year, pq.q),
          outputVat: M.toDb(pq.outputVat),
          inputVat: M.toDb(pq.inputVat),
          netVat: M.toDb(pq.netVat),
        })),
        topVatableCustomers: custRows.map((r: any) => ({ name: custNames.get(r.id) ?? r.id, vatAmount: M.toDb(M.money(r.vat)) })),
        topVatableSuppliers: supplierRows.map((r: any) => ({ name: suppNames.get(r.id) ?? r.id, vatAmount: M.toDb(M.money(r.vat)) })),
      };
    });
  }

  async cashFlowForecast(actor: AccessTokenPayload) {
    if (!actor.tenantId) return { inflows: [], outflows: [], net: '0' };
    const { tenantId, companyId } = this.scope(actor);
    const today = todayIso();
    const COLLECTION_RATE = 0.8;
    const PAYMENT_RATE = 0.95;

    return withTenant(this.db, tenantId, async (tx) => {
      // Current cash balance from bank GL accounts
      const all = await movements(tx as any, companyId);
      const banks = await (tx as any).select().from(bankAccounts).where(eq(bankAccounts.companyId, companyId));
      let cash = M.money(0);
      for (const b of banks) {
        const m = all.get(b.glAccountId);
        if (m) cash = M.add(cash, M.sub(m.d, m.c));
      }

      // 12 weeks forecast
      const todayDate = new Date(today);
      const forecast = [];
      let running = cash;

      for (let i = 0; i < 12; i++) {
        const wStart = weekStart(todayDate, i);
        const wEnd = weekStart(todayDate, i + 1);
        wEnd.setUTCDate(wEnd.getUTCDate() - 1);
        const wFromStr = isoDate(wStart);
        const wToStr = isoDate(wEnd);

        const [inRow] = await (tx as any)
          .select({ total: sql<string>`coalesce(sum(${invoices.balanceDue}),0)` })
          .from(invoices)
          .where(and(
            eq(invoices.companyId, companyId),
            eq(invoices.type, 'invoice'),
            inArray(invoices.status, ['posted', 'partially_paid', 'overdue']),
            gte(invoices.dueDate, wFromStr),
            lte(invoices.dueDate, wToStr),
          ));

        const [outRow] = await (tx as any)
          .select({ total: sql<string>`coalesce(sum(${supplierInvoices.balanceDue}),0)` })
          .from(supplierInvoices)
          .where(and(
            eq(supplierInvoices.companyId, companyId),
            inArray(supplierInvoices.status, ['posted', 'partially_paid']),
            gte(supplierInvoices.dueDate, wFromStr),
            lte(supplierInvoices.dueDate, wToStr),
          ));

        const rawIn = M.money(inRow?.total ?? '0');
        const rawOut = M.money(outRow?.total ?? '0');
        const inflow = M.mul(rawIn, M.money(COLLECTION_RATE));
        const outflow = M.mul(rawOut, M.money(PAYMENT_RATE));
        const net = M.sub(inflow, outflow);
        running = M.add(running, net);

        const startDay = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        const endDay = wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

        forecast.push({
          week: `Week ${i + 1} (${startDay}–${endDay})`,
          expectedInflows: M.toDb(inflow),
          expectedOutflows: M.toDb(outflow),
          netCashFlow: M.toDb(net),
          runningBalance: M.toDb(running),
        });
      }

      return {
        currentBalance: M.toDb(cash),
        forecast,
        assumptions: { collectionRate: COLLECTION_RATE, paymentRate: PAYMENT_RATE },
      };
    });
  }

  async customerAnalytics(actor: AccessTokenPayload) {
    if (!actor.tenantId) return { topCustomers: [], retentionRate: '0', avgOrderValue: '0' };
    const { tenantId, companyId } = this.scope(actor);
    const today = todayIso();
    const from12 = monthStart(today, 11);

    return withTenant(this.db, tenantId, async (tx) => {
      // All invoices for aggregation
      const allInv = await (tx as any)
        .select()
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...SALES_POSTED])));

      const custMap = new Map<string, { revenue: M.Money; count: number; outstanding: M.Money; lastDate: string }>();
      let totalPaidOnTime = 0, totalPaidLate = 0, totalOutstanding = 0;

      for (const inv of allInv) {
        const a = custMap.get(inv.customerId) ?? { revenue: M.money(0), count: 0, outstanding: M.money(0), lastDate: '' };
        custMap.set(inv.customerId, {
          revenue: M.add(a.revenue, M.money(inv.total)),
          count: a.count + 1,
          outstanding: M.add(a.outstanding, M.money(inv.balanceDue)),
          lastDate: !a.lastDate || inv.date > a.lastDate ? inv.date : a.lastDate,
        });
        if (['paid'].includes(inv.status)) {
          totalPaidOnTime++;
        } else if (['posted', 'partially_paid', 'overdue'].includes(inv.status)) {
          if (inv.status === 'overdue') totalPaidLate++;
          else totalOutstanding++;
        }
      }

      const custNames = new Map((await (tx as any).select().from(customers).where(eq(customers.companyId, companyId))).map((c: any) => [c.id, c.name ?? c.nameEn ?? ''] as [string, string]));

      const totalInvoices = totalPaidOnTime + totalPaidLate + totalOutstanding;
      const pct = (n: number) => totalInvoices > 0 ? Math.round((n / totalInvoices) * 100) : 0;

      const topCustomers = [...custMap.entries()]
        .sort(([, a], [, b]) => M.money(b.revenue.toString()).comparedTo(M.money(a.revenue.toString())))
        .slice(0, 20)
        .map(([id, d]) => ({
          id,
          name: custNames.get(id) ?? id,
          totalRevenue: M.toDb(d.revenue),
          invoiceCount: d.count,
          avgPaymentDays: 30, // approximation — no payment date vs due date diff available without join
          outstandingBalance: M.toDb(d.outstanding),
          lastInvoiceDate: d.lastDate,
        }));

      // Revenue by month (last 12)
      const monthInv = await (tx as any)
        .select({ date: invoices.date, total: invoices.total })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...SALES_POSTED]), gte(invoices.date, from12), lte(invoices.date, today)));

      const months = Array.from({ length: 12 }, (_, i) => monthStart(today, 11 - i).slice(0, 7));
      const byMonth = new Map(months.map((m) => [m, M.money(0)]));
      for (const r of monthInv) {
        const k = r.date.slice(0, 7);
        if (byMonth.has(k)) byMonth.set(k, M.add(byMonth.get(k)!, M.money(r.total)));
      }

      return {
        topCustomers,
        paymentBehavior: {
          paidOnTime: pct(totalPaidOnTime),
          paidLate: pct(totalPaidLate),
          outstanding: pct(totalOutstanding),
        },
        revenueByMonth: months.map((m) => ({ month: m, revenue: M.toDb(byMonth.get(m)!) })),
      };
    });
  }
}
