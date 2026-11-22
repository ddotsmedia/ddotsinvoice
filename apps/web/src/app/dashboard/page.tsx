'use client';

import Link from 'next/link';
import { useState, type ComponentType, type ReactNode } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LabelList, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertCircle, Banknote, BarChart3, Building2, Clock, CreditCard, FilePlus, Plus, TrendingDown, TrendingUp, UserPlus, UserRound, Users, Wallet } from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId, setStoredCompanyId } from '@/lib/company';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { CreateCompanyModal } from '@/components/create-company-modal';

interface Dash {
  totalRevenue: string; totalExpenses: string; netProfit: string;
  outstandingReceivables: string; outstandingPayables: string; cashBalance: string;
  topCustomers: { customerId: string; nameEn: string; nameAr: string; totalAmount: string }[];
}
interface Invoice { id: string; number: string; date: string; dueDate: string | null; total: string; status: string; customerId: string }
interface Aging { asOfDate: string; totals: { current?: string; d31_60?: string; d61_90?: string; d91_120?: string; d120plus?: string; total?: string } }
interface PayrollRun { id: string; periodYear: number; periodMonth: number; status: string; totalGross: string; totalNet: string }
interface InvoiceSummary { forecast: string; totalValue: string }
interface PaymentMethods { items: { method: string; count: number; amount: string }[]; total: string }

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : aed.format(Number(money(String(v)).toFixed(2))));
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const DONUT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];
// Payment methods supported by the schema (no "online" method exists yet)
const PAY_METHODS = [
  { key: 'cash', en: 'Cash', ar: 'نقد', color: '#3B82F6' },
  { key: 'bank_transfer', en: 'Bank Transfer', ar: 'تحويل بنكي', color: '#10B981' },
  { key: 'card', en: 'Card', ar: 'بطاقة', color: '#F59E0B' },
  { key: 'cheque', en: 'Cheque', ar: 'شيك', color: '#8B5CF6' },
];

/** Calendar month `offset` months back (0 = current), UTC. */
const monthBounds = (offset: number) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { from: ymd(start), to: ymd(end), label: start.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) };
};

const INVOICE_STATUS: Record<string, string> = {
  paid: 'bg-green-600 text-white',
  posted: 'bg-blue-600 text-white',
  partially_paid: 'bg-amber-500 text-white',
  draft: 'bg-gray-400 text-white',
  overdue: 'bg-red-600 text-white',
};

// Row colour by invoice status
const INVOICE_ROW: Record<string, string> = {
  overdue: 'bg-red-50 hover:bg-red-100',
  partially_paid: 'bg-amber-50 hover:bg-amber-100',
  paid: 'bg-green-50 hover:bg-green-100',
  posted: 'bg-white hover:bg-blue-50',
  draft: 'bg-gray-50 hover:bg-gray-100',
};
// Statuses that can be past due
const OPEN_STATUSES = ['sent', 'posted', 'partially_paid', 'overdue'];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

function Kpi({ label, value, gradient, icon: Icon, trend }: { label: string; value: string; gradient: string; icon: ComponentType<{ className?: string }>; trend: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg" style={{ background: gradient }}>
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mb-1 mt-2 text-3xl font-bold text-white" dir="ltr">{value}</div>
      <div className="flex items-center gap-1 text-xs text-white/80">{trend}</div>
    </div>
  );
}

function Card({ title, subtitle, action, children, className = '', padded = true }: { title: string; subtitle?: string; action?: { href: string; label: string }; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-xl bg-white shadow-md ${className}`}>
      <header className="flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action && <Link href={action.href} className="text-sm font-medium text-blue-600 hover:underline">{action.label}</Link>}
      </header>
      <div className={padded ? 'p-6' : ''}>{children}</div>
    </section>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 mt-10 flex items-center gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export default function DashboardPage() {
  const L = useLabel();
  const { user } = useAuth({ fetchUser: true });
  const companyId = useActiveCompanyId(user);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const on = !!companyId;
  const today = ymd(new Date());
  const month = monthBounds(0);
  const ytdFrom = `${new Date().getUTCFullYear()}-01-01`;

  const kpi = useQuery({
    queryKey: ['dash', companyId, 'kpi', month.from],
    enabled: on,
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: month.from, toDate: month.to } })).data,
  });
  const ytd = useQuery({
    queryKey: ['dash', companyId, 'ytd', today],
    enabled: on,
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: ytdFrom, toDate: today } })).data,
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
    queryFn: async () => (await api.get<{ items: Invoice[] }>('/invoicing/invoices', { params: { limit: 10 } })).data.items,
  });
  const customers = useQuery({
    queryKey: ['dash', companyId, 'customers'],
    enabled: on,
    queryFn: async () => (await api.get<{ items: { id: string; name: string }[] }>('/invoicing/customers', { params: { limit: 100 } })).data.items,
  });
  const aging = useQuery({
    queryKey: ['dash', companyId, 'aging', today],
    enabled: on,
    queryFn: async () => (await api.get<Aging>('/reports/aging/receivables', { params: { asOfDate: today } })).data,
  });
  const payroll = useQuery({
    queryKey: ['dash', companyId, 'payroll'],
    enabled: on,
    queryFn: async () => (await api.get<{ items: PayrollRun[] }>('/hr/payroll', { params: { limit: 3 } })).data.items,
  });
  const employees = useQuery({
    queryKey: ['dash', companyId, 'employees'],
    enabled: on,
    queryFn: async () => (await api.get<{ total: number }>('/hr/employees', { params: { limit: 1, status: 'active' } })).data.total,
  });
  const summary = useQuery({
    queryKey: ['dash', companyId, 'invoice-summary'],
    enabled: on,
    queryFn: async () => (await api.get<InvoiceSummary>('/reports/invoice-summary')).data,
  });
  const payMethods = useQuery({
    queryKey: ['dash', companyId, 'payment-methods', ytdFrom, today],
    enabled: on,
    queryFn: async () => (await api.get<PaymentMethods>('/reports/payment-methods', { params: { fromDate: ytdFrom, toDate: today } })).data,
  });

  if (!user) return <Skeleton className="h-40" />;
  if (!companyId) {
    return (
      <>
        <div className="mx-auto mt-10 max-w-md rounded-xl bg-white p-8 text-center shadow-md">
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}
          >
            <Building2 className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{L('Select a company to view dashboard', 'اختر شركة لعرض لوحة المعلومات')}</h1>
          <p className="mt-2 text-sm text-gray-500">{L('Use the company selector in the top bar, or create your first company below.', 'استخدم قائمة الشركات في الشريط العلوي، أو أنشئ شركتك الأولى أدناه.')}</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1E4FC2, #3B82F6)' }}
          >
            <Plus className="h-4 w-4" />
            {L('Create your first company', 'إنشاء شركتك الأولى')}
          </button>
        </div>
        <CreateCompanyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(id) => {
            setStoredCompanyId(id);
            void qc.invalidateQueries();
          }}
        />
      </>
    );
  }

  const failed = [kpi, ytd, invoices, customers, aging, payroll, employees].find((q) => q.error);
  if (failed?.error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-white p-6 text-sm shadow-md">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <div className="font-semibold text-gray-900">{L('Dashboard data could not be loaded', 'تعذر تحميل بيانات اللوحة')}</div>
          <div className="text-gray-500">{errMsg(failed.error)}</div>
        </div>
      </div>
    );
  }

  const d = kpi.data;
  // Last 6 months, oldest first (current month last)
  const chart = series.map((s, i) => {
    const b = monthBounds([5, 4, 3, 2, 1, 0][i]);
    const revenue = Number(s.data?.totalRevenue ?? 0);
    const expenses = Number(s.data?.totalExpenses ?? 0);
    return { month: b.label, revenue, expenses, net: revenue - expenses };
  });
  const names = new Map((customers.data ?? []).map((c) => [c.id, c.name]));

  // Section A — AR aging (API buckets: current = 0–30 days past due)
  const t = aging.data?.totals ?? {};
  const agingBuckets = [
    { label: L('Current (0–30 days)', 'حالية (0–30 يوما)'), value: Number(t.current ?? 0), bar: 'bg-green-500' },
    { label: L('31–60 days', '31–60 يوما'), value: Number(t.d31_60 ?? 0), bar: 'bg-amber-500' },
    { label: L('61–90 days', '61–90 يوما'), value: Number(t.d61_90 ?? 0), bar: 'bg-orange-500' },
    { label: L('91–120 days', '91–120 يوما'), value: Number(t.d91_120 ?? 0), bar: 'bg-red-500' },
    { label: L('Over 120 days', 'أكثر من 120 يوما'), value: Number(t.d120plus ?? 0), bar: 'bg-red-700' },
  ];
  const agingTotal = Number(t.total ?? 0);

  // Section B — top customers (year to date)
  const topAll = ytd.data?.topCustomers ?? [];
  const topSum = topAll.reduce((s, c) => s + Number(c.totalAmount), 0);
  const topFive = topAll.slice(0, 5).map((c) => {
    const name = L(c.nameEn, c.nameAr);
    return { name, short: name.length > 18 ? `${name.slice(0, 18)}…` : name, amount: Number(c.totalAmount) };
  });

  // Section C — payroll & HR (from latest payroll run + active employee count)
  const latestGross = Number(payroll.data?.[0]?.totalGross ?? 0);
  const empCount = Number(employees.data ?? 0);
  const avgSalary = empCount > 0 ? latestGross / empCount : 0;

  return (
    <div className="-m-4 min-h-screen bg-gray-100 p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{L('Dashboard', 'لوحة المعلومات')}</h1>
          <p className="mt-1 text-sm text-gray-500">{L(`Month to date · ${month.label}`, `الشهر الحالي · ${month.label}`)}</p>
        </header>

        {/* KPIs: 3 cols lg, 2 md, 1 sm */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!d ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />) : (
            <>
              <Kpi label={L('Revenue (this month)', 'إيرادات الشهر')} value={fmt(d.totalRevenue)} gradient="linear-gradient(135deg, #1E4FC2, #3B72F0)" icon={TrendingUp} trend={L('↑ This month', '↑ هذا الشهر')} />
              <Kpi label={L('Receivables', 'الذمم المدينة')} value={fmt(d.outstandingReceivables)} gradient="linear-gradient(135deg, #D97706, #F59E0B)" icon={Clock} trend={L('↑ Outstanding', '↑ مستحقة')} />
              <Kpi label={L('Net Profit (this month)', 'صافي الربح')} value={fmt(d.netProfit)} gradient="linear-gradient(135deg, #059669, #10B981)" icon={Banknote} trend={L('↑ This month', '↑ هذا الشهر')} />
              <Kpi label={L('Cash Balance', 'النقد')} value={fmt(d.cashBalance)} gradient="linear-gradient(135deg, #4F46E5, #818CF8)" icon={Wallet} trend={L('↑ Current', '↑ الحالي')} />
              <Kpi label={L('Payables', 'الذمم الدائنة')} value={fmt(d.outstandingPayables)} gradient="linear-gradient(135deg, #DC2626, #F87171)" icon={TrendingDown} trend={L('↑ Outstanding', '↑ مستحقة')} />
            </>
          )}
          {employees.data === undefined ? <Skeleton className="h-32" /> : (
            <Kpi label={L('Employees', 'الموظفون')} value={String(employees.data)} gradient="linear-gradient(135deg, #7C3AED, #A78BFA)" icon={UserRound} trend={L('↑ Active', '↑ نشطون')} />
          )}
          {summary.data === undefined ? <Skeleton className="h-32" /> : (
            <Kpi label={L('FORECASTED REVENUE', 'الإيرادات المتوقعة')} value={fmt(summary.data.forecast)} gradient="linear-gradient(135deg, #6D28D9, #C084FC)" icon={TrendingUp} trend={L('↑ Draft + sent invoices', '↑ مسودات + فواتير مرسلة')} />
          )}
        </div>

        <SectionHeader title={L('Business Overview', 'نظرة عامة على الأعمال')} subtitle={L('Revenue · Expenses · Net Profit', 'الإيرادات · المصروفات · صافي الربح')} />

        {/* Chart 60% | Recent invoices 40% on lg */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card title={L('Revenue vs Expenses', 'الإيرادات مقابل المصروفات')} subtitle={L('Last 6 months', 'آخر 6 أشهر')} className="lg:col-span-3">
            {series.some((s) => s.isLoading) ? <Skeleton className="h-[320px]" /> : (
              <>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `AED ${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: '#6B7280' }} width={80} />
                      <Tooltip formatter={(val, name) => [`AED ${Number(val).toLocaleString('en-AE')}`, String(name)]} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Legend iconType="square" wrapperStyle={{ paddingTop: 12 }} />
                      <Bar dataKey="revenue" name={L('Revenue', 'الإيرادات')} fill="#1E4FC2" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name={L('Expenses', 'المصروفات')} fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="net" name={L('Net Profit', 'صافي الربح')} stroke="#10B981" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Card>

          <Card title={L('Recent Invoices', 'أحدث الفواتير')} action={{ href: '/dashboard/invoicing/invoices?type=invoice', label: L('View all', 'عرض الكل') }} className="lg:col-span-2" padded={false}>
            {!invoices.data ? <Skeleton className="m-6 h-72" /> : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-start">{L('Invoice #', 'رقم')}</th>
                      <th className="px-4 py-3 text-start">{L('Customer', 'العميل')}</th>
                      <th className="px-4 py-3 text-end">{L('Amount', 'المبلغ')}</th>
                      <th className="px-4 py-3 text-start">{L('Status', 'الحالة')}</th>
                      <th className="px-4 py-3 text-start">{L('Date', 'التاريخ')}</th>
                      <th className="px-4 py-3 text-start">{L('Due', 'الاستحقاق')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.data.map((inv) => {
                      const daysOver = inv.dueDate && OPEN_STATUSES.includes(inv.status)
                        ? Math.floor((Date.parse(today) - Date.parse(inv.dueDate)) / 86400000)
                        : 0;
                      return (
                        <tr key={inv.id} className={`border-b border-gray-100 transition-colors ${INVOICE_ROW[inv.status] ?? 'bg-white hover:bg-blue-50'}`}>
                          <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{inv.number}</td>
                          <td className="max-w-28 truncate px-4 py-3 font-medium text-gray-800">{names.get(inv.customerId) ?? '—'}</td>
                          <td className="px-4 py-3 text-end font-semibold text-gray-900" dir="ltr">{fmt(inv.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {inv.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{inv.date}</td>
                          <td className="px-4 py-3 text-xs">
                            {daysOver > 0
                              ? <span className="font-semibold text-red-600">{L(`${daysOver} days overdue`, `متأخرة ${daysOver} يوما`)}</span>
                              : <span className="text-gray-500">{inv.dueDate ?? '—'}</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {!invoices.data.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">{L('No invoices yet', 'لا توجد فواتير بعد')}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Monthly breakdown */}
        <div className="mt-6">
          <Card title={L('Monthly Breakdown', 'التفصيل الشهري')} padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-start">{L('Month', 'الشهر')}</th>
                    <th className="px-4 py-3 text-end">{L('Revenue', 'الإيرادات')}</th>
                    <th className="px-4 py-3 text-end">{L('Expenses', 'المصروفات')}</th>
                    <th className="px-4 py-3 text-end">{L('Net', 'الصافي')}</th>
                    <th className="px-4 py-3 text-end">{L('Invoices', 'الفواتير')}</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.map((r, i) => {
                    const current = i === chart.length - 1;
                    return (
                      <tr key={r.month} className={`border-t border-gray-100 ${current ? 'bg-blue-50 font-bold' : i % 2 ? 'bg-gray-50/50' : 'bg-white'}`}>
                        <td className="px-4 py-2 text-gray-800">{r.month}</td>
                        <td className="px-4 py-2 text-end font-semibold text-blue-700" dir="ltr">{fmt(r.revenue)}</td>
                        <td className="px-4 py-2 text-end text-gray-700" dir="ltr">{fmt(r.expenses)}</td>
                        <td className={`px-4 py-2 text-end font-semibold ${r.net >= 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">{fmt(r.net)}</td>
                        <td className="px-4 py-2 text-end text-gray-400">—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Section A — AR aging: bars left, donut right */}
        <SectionHeader title={L('AR Aging', 'أعمار الذمم المدينة')} />
        <Card title={L('Receivables by days past due', 'الذمم المدينة حسب أيام التأخير')} subtitle={L(`As of ${today}`, `حتى ${today}`)}>
          {aging.isLoading ? <Skeleton className="h-64" /> : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                {agingBuckets.map((b) => {
                  const pct = agingTotal > 0 ? (b.value / agingTotal) * 100 : 0;
                  return (
                    <div key={b.label} className="mb-3 flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-gray-500">{b.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div style={{ width: `${pct}%` }} className={`h-2 rounded-full ${b.bar}`} />
                      </div>
                      <span className="w-32 text-right text-xs font-semibold text-gray-800" dir="ltr">{fmt(b.value)}</span>
                      <span className="w-12 text-right text-xs text-gray-400">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
                <div className="mt-4 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
                  {L('Total', 'الإجمالي')}: <span className="font-mono" dir="ltr">{fmt(agingTotal)}</span>
                </div>
              </div>

              <div>
                <div className="relative h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={agingBuckets.map((b) => ({ name: b.label, value: b.value }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} stroke="none">
                        {agingBuckets.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => aed.format(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500">{L('Total', 'الإجمالي')}</span>
                    <span className="font-mono text-sm font-bold text-gray-900" dir="ltr">{`AED ${Math.round(agingTotal / 1000)}K`}</span>
                  </div>
                </div>
                <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-600">
                  {agingBuckets.map((b, i) => (
                    <li key={b.label} className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i] }} />
                      {b.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* Payment analytics — payment method split (year to date) */}
        <SectionHeader title={L('Payment Analytics', 'تحليل المدفوعات')} />
        <Card title={L('Payment Methods', 'طرق الدفع')} subtitle={L('Year to date', 'منذ بداية السنة')}>
          {payMethods.isLoading ? <Skeleton className="h-[240px]" /> : (() => {
            const items = payMethods.data?.items ?? [];
            const total = Number(payMethods.data?.total ?? 0);
            const rows = PAY_METHODS.map((m) => {
              const amount = Number(items.find((i) => i.method === m.key)?.amount ?? 0);
              return { name: L(m.en, m.ar), amount, pct: total > 0 ? (amount / total) * 100 : 0, color: m.color };
            });
            return (
              <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
                <div className="relative h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={rows} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={85} stroke="none">
                        {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => aed.format(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500">{L('Total', 'الإجمالي')}</span>
                    <span className="font-mono text-sm font-bold text-gray-900" dir="ltr">{fmt(total)}</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {rows.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        {r.name}
                      </span>
                      <span className="font-mono text-gray-900" dir="ltr">
                        {fmt(r.amount)} <span className="ms-2 text-xs text-gray-400">{r.pct.toFixed(1)}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </Card>

        {/* Section B — top customers */}
        <SectionHeader title={L('Top Customers', 'أفضل العملاء')} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={L('Revenue by Customer', 'الإيرادات حسب العميل')} subtitle={L('Year to date', 'منذ بداية السنة')}>
            {ytd.isLoading ? <Skeleton className="h-[220px]" /> : topFive.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">{L('No customer data', 'لا توجد بيانات عملاء')}</div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topFive.map((c) => ({ name: c.short, amount: c.amount }))} layout="vertical" margin={{ left: 8, right: 90 }}>
                    <defs>
                      <linearGradient id="customerGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1E4FC2" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => `AED ${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip formatter={(v) => `AED ${Number(v).toLocaleString('en-AE')}`} />
                    <Bar dataKey="amount" fill="url(#customerGradient)" radius={[0, 6, 6, 0]} barSize={18}>
                      <LabelList dataKey="amount" position="right" formatter={(v: unknown) => `AED ${Number(v).toLocaleString('en-AE')}`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title={L('Customer Rankings', 'ترتيب العملاء')}>
            {ytd.isLoading ? <Skeleton className="h-[220px]" /> : topFive.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">{L('No customer data', 'لا توجد بيانات عملاء')}</div>
            ) : (
              <div>
                {topFive.map((c, i) => {
                  const pct = topSum > 0 ? (c.amount / topSum) * 100 : 0;
                  return (
                    <div key={`${c.name}-${i}`} className="mb-4 flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500" dir="ltr">{`AED ${c.amount.toLocaleString('en-AE')}`}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Section C — payroll & HR */}
        <SectionHeader title={L('Payroll & HR', 'الرواتب والموارد البشرية')} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: L('Total Payroll (latest run)', 'إجمالي الرواتب (آخر مسير)'), value: fmt(latestGross), icon: Banknote },
            { label: L('Active Employees', 'الموظفون النشطون'), value: String(empCount), icon: Users },
            { label: L('Avg Salary', 'متوسط الراتب'), value: fmt(avgSalary), icon: TrendingUp },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-center justify-between rounded-2xl border-l-4 border-indigo-400 bg-white p-5 shadow-sm">
                <div>
                  <div className="text-xs uppercase text-gray-500">{c.label}</div>
                  <div className="mt-1 text-xl font-bold text-gray-900" dir="ltr">{c.value}</div>
                </div>
                <Icon className="h-5 w-5 text-indigo-400" />
              </div>
            );
          })}
        </div>

        {/* Section D — quick actions */}
        <SectionHeader title={L('Quick Actions', 'إجراءات سريعة')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/dashboard/invoicing/invoices/new', icon: FilePlus, label: L('New Invoice', 'فاتورة جديدة'), sub: L('Create invoice', 'إنشاء فاتورة') },
            { href: '/dashboard/invoicing/customers', icon: UserPlus, label: L('Add Customer', 'إضافة عميل'), sub: L('Customers list', 'قائمة العملاء') },
            { href: '/dashboard/payments/customer-payments/new', icon: CreditCard, label: L('Record Payment', 'تسجيل دفعة'), sub: L('Log receipt', 'تسجيل إيصال') },
            { href: '/dashboard/reports', icon: BarChart3, label: L('View Reports', 'عرض التقارير'), sub: L('Financial reports', 'التقارير المالية') },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-800">{a.label}</span>
                  <span className="block text-xs text-gray-500">{a.sub}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
