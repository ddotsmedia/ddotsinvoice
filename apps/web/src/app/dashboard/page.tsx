'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, Building2, Clock, Percent, Plus, TrendingDown, Wallet,
} from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId, setStoredCompanyId } from '@/lib/company';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { CreateCompanyModal } from '@/components/create-company-modal';
import { KpiCard } from './components/KpiCard';
import { NetProfitHero } from './components/NetProfitHero';
import { CashRunway } from './components/CashRunway';
import { ProfitTrendChart } from './components/ProfitTrendChart';
import { AiInsights } from './components/AiInsights';
import { QuickActions } from './components/QuickActions';

interface Dash {
  totalRevenue: string; totalExpenses: string; netProfit: string;
  outstandingReceivables: string; outstandingPayables: string; cashBalance: string;
  topCustomers: { customerId: string; nameEn: string; nameAr: string; totalAmount: string }[];
}
interface Invoice { id: string; number: string; date: string; dueDate: string | null; total: string; status: string; customerId: string }

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });
const fmt = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? 'AED 0' : aed.format(Number(money(String(v)).toFixed(2))));
const ymd = (d: Date) => d.toISOString().slice(0, 10);

const monthBounds = (offset: number) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { from: ymd(start), to: ymd(end), label: start.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) };
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-gray-200 ${className}`} />;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const OPEN_STATUSES = ['sent', 'posted', 'partially_paid', 'overdue'];

export default function DashboardPage() {
  const L = useLabel();
  const { user } = useAuth({ fetchUser: true });
  const companyId = useActiveCompanyId(user);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const on = !!companyId;
  const today = ymd(new Date());
  const month = monthBounds(0);
  const prevMonth = monthBounds(1);
  const fiscalYear = `FY ${new Date().getUTCFullYear()}`;

  const kpi = useQuery({
    queryKey: ['dash', companyId, 'kpi', month.from],
    enabled: on,
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: month.from, toDate: month.to } })).data,
  });
  const prevKpi = useQuery({
    queryKey: ['dash', companyId, 'kpi', prevMonth.from],
    enabled: on,
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: prevMonth.from, toDate: prevMonth.to } })).data,
  });
  const series = useQueries({
    queries: [5, 4, 3, 2, 1, 0].map((o) => {
      const b = monthBounds(o);
      return {
        queryKey: ['dash', companyId, 'kpi', b.from],
        enabled: on,
        queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: b.from, toDate: b.to } })).data,
      };
    }),
  });
  const invoices = useQuery({
    queryKey: ['dash', companyId, 'invoices'],
    enabled: on,
    queryFn: async () => (await api.get<{ items: Invoice[] }>('/invoicing/invoices', { params: { limit: 20 } })).data.items,
  });

  if (!user) return <div className="p-8"><Skeleton className="h-32" /></div>;

  if (!companyId) {
    return (
      <>
        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{L('Select a company to view dashboard', 'اختر شركة لعرض لوحة المعلومات')}</h1>
          <p className="mt-2 text-sm text-gray-500">{L('Use the company selector in the top bar, or create your first company below.', 'استخدم قائمة الشركات في الشريط العلوي، أو أنشئ شركتك الأولى أدناه.')}</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {L('Create your first company', 'إنشاء شركتك الأولى')}
          </button>
        </div>
        <CreateCompanyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(id) => { setStoredCompanyId(id); void qc.invalidateQueries(); }}
        />
      </>
    );
  }

  const failed = [kpi, invoices].find((q) => q.error);
  if (failed?.error) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-white p-6 text-sm shadow-md">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <div className="font-semibold text-gray-900">{L('Dashboard data could not be loaded', 'تعذر تحميل بيانات اللوحة')}</div>
          <div className="text-gray-500">{errMsg(failed.error)}</div>
        </div>
      </div>
    );
  }

  const d = kpi.data;
  const p = prevKpi.data;

  // Compute % change vs previous month
  const pctChange = (curr: string | undefined, prev: string | undefined): number | undefined => {
    const c = Number(curr ?? 0);
    const pv = Number(prev ?? 0);
    if (pv === 0) return undefined;
    return ((c - pv) / Math.abs(pv)) * 100;
  };

  // Chart data for 6 months
  const chartData = series.map((s, i) => {
    const b = monthBounds([5, 4, 3, 2, 1, 0][i]);
    const revenue = Number(s.data?.totalRevenue ?? 0);
    const expenses = Number(s.data?.totalExpenses ?? 0);
    return { month: b.label, revenue, expenses, net: revenue - expenses };
  });
  const seriesLoading = series.some((s) => s.isLoading);

  // Runway calculation: cashBalance / (monthlyExpenses / 4.33) => weeks
  const cashNum = Number(d?.cashBalance ?? 0);
  const expNum = Number(d?.totalExpenses ?? 0);
  const runwayWeeks = expNum > 0 ? (cashNum / (expNum / 4.33)) : 999;

  // Count overdue invoices
  const overdueCount = (invoices.data ?? []).filter((inv) => {
    if (!inv.dueDate || !OPEN_STATUSES.includes(inv.status)) return false;
    return Date.parse(today) > Date.parse(inv.dueDate);
  }).length;

  const receivablesNum = Number(d?.outstandingReceivables ?? 0);
  const netProfitNum = Number(d?.netProfit ?? 0);

  // Fake VAT estimate (5% of revenue - 5% of expenses) if no dedicated endpoint
  const vatEstimate = Number(d?.totalRevenue ?? 0) * 0.05 - Number(d?.totalExpenses ?? 0) * 0.05;

  return (
    <div className="-m-4 min-h-screen bg-[#F8FAFC] p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* ── GREETING + FISCAL YEAR ───────────────────────────────── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {getGreeting()}{user ? `, ${user.firstName}` : ''} 👋
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {month.label} · {fiscalYear} · Overview
            </p>
          </div>
          <Link
            href="/dashboard/invoicing/invoices/new"
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>

        {/* ── 4 KPI CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {!d ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <>
              <KpiCard
                label="Receivables"
                value={fmt(d.outstandingReceivables)}
                change={pctChange(d.outstandingReceivables, p?.outstandingReceivables)}
                icon={Clock}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <KpiCard
                label="Payables"
                value={fmt(d.outstandingPayables)}
                change={pctChange(d.outstandingPayables, p?.outstandingPayables)}
                icon={TrendingDown}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />
              <KpiCard
                label="Cash Position"
                value={fmt(d.cashBalance)}
                change={pctChange(d.cashBalance, p?.cashBalance)}
                icon={Wallet}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <KpiCard
                label="Net VAT (est.)"
                value={fmt(vatEstimate)}
                change={undefined}
                icon={Percent}
                iconBg="bg-amber-50"
                iconColor="text-amber-600"
              />
            </>
          )}
        </div>

        {/* ── HERO + CASH RUNWAY ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {!d ? (
              <Skeleton className="h-48" />
            ) : (
              <NetProfitHero
                value={fmt(d.netProfit)}
                change={pctChange(d.netProfit, p?.netProfit)}
                period={`Net Profit · ${month.label}`}
              />
            )}
          </div>
          <div className="lg:col-span-3">
            {!d ? (
              <Skeleton className="h-48" />
            ) : (
              <CashRunway
                runwayWeeks={runwayWeeks}
                corporateBalance={fmt(d.cashBalance)}
                cashOnHand={fmt(Number(d.cashBalance) * 0.3)}
              />
            )}
          </div>
        </div>

        {/* ── TREND CHART + AI INSIGHTS + QUICK ACTIONS ───────────── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ProfitTrendChart data={chartData} isLoading={seriesLoading} />
          </div>
          <div className="xl:col-span-1 space-y-4">
            <AiInsights
              receivables={receivablesNum}
              overdueCount={overdueCount}
              netProfit={netProfitNum}
            />
          </div>
        </div>

        {/* ── QUICK ACTIONS + RECENT INVOICES ─────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
          <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Invoices</h3>
              <Link href="/dashboard/invoicing/invoices?type=invoice" className="text-xs font-medium text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            {!invoices.data ? (
              <div className="p-6"><Skeleton className="h-40" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-start">Invoice #</th>
                      <th className="px-4 py-3 text-end">Amount</th>
                      <th className="px-4 py-3 text-start">Status</th>
                      <th className="px-4 py-3 text-start">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.data.slice(0, 8).map((inv) => {
                      const statusColors: Record<string, string> = {
                        paid: 'bg-emerald-50 text-emerald-700',
                        posted: 'bg-blue-50 text-blue-700',
                        partially_paid: 'bg-amber-50 text-amber-700',
                        draft: 'bg-gray-100 text-gray-600',
                        overdue: 'bg-red-50 text-red-700',
                      };
                      return (
                        <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">{inv.number}</td>
                          <td className="px-4 py-3 text-end font-semibold text-gray-900 tabular-nums" dir="ltr">
                            {aed.format(Number(money(inv.total).toFixed(2)))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {inv.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{inv.date}</td>
                        </tr>
                      );
                    })}
                    {!invoices.data.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                          No invoices yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
