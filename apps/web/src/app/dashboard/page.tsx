'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Banknote, Clock, TrendingDown, TrendingUp, UserRound, Wallet } from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId } from '@/lib/company';
import { useLabel, errMsg } from '@/lib/ui-helpers';

interface Dash {
  totalRevenue: string; totalExpenses: string; netProfit: string;
  outstandingReceivables: string; outstandingPayables: string; cashBalance: string;
  topCustomers: { customerId: string; nameEn: string; nameAr: string; totalAmount: string }[];
}
interface Invoice { id: string; number: string; date: string; total: string; status: string; customerId: string }
interface Aging { asOfDate: string; totals: { current?: string; d31_60?: string; d61_90?: string; d91_120?: string; d120plus?: string; total?: string } }
interface PayrollRun { id: string; periodYear: number; periodMonth: number; status: string; totalGross: string; totalNet: string }

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : aed.format(Number(money(String(v)).toFixed(2))));
const ymd = (d: Date) => d.toISOString().slice(0, 10);
// Y axis: AED 25K / 50K / 75K / 100K
const kTick = (v: number) => (v >= 1000 ? `AED ${Math.round(v / 1000)}K` : `AED ${Math.round(v)}`);

/** Calendar month `offset` months back (0 = current), UTC. */
const monthBounds = (offset: number) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { from: ymd(start), to: ymd(end), label: start.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) };
};

const INVOICE_STATUS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  posted: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-600',
  overdue: 'bg-red-100 text-red-700',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

function Kpi({ label, value, accent, icon: Icon, tone, trend }: { label: string; value: string; accent: string; icon: ComponentType<{ className?: string }>; tone?: string; trend: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 pl-6 shadow-md">
      <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone ?? 'text-gray-900'}`} dir="ltr">{value}</div>
      <div className="mt-2 text-xs font-medium" style={{ color: accent }}>{trend}</div>
    </div>
  );
}

function Card({ title, subtitle, action, children, className = '', padded = true }: { title: string; subtitle?: string; action?: { href: string; label: string }; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-xl bg-white shadow-md ${className}`}>
      <header className="flex items-start justify-between px-6 pt-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action && <Link href={action.href} className="text-sm font-medium text-blue-600 hover:underline">{action.label}</Link>}
      </header>
      <div className={padded ? 'p-6' : ''}>{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const L = useLabel();
  const { user } = useAuth({ fetchUser: true });
  const companyId = useActiveCompanyId(user);
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
    queryFn: async () => (await api.get<{ items: Invoice[] }>('/invoicing/invoices', { params: { limit: 5 } })).data.items,
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

  if (!user) return <Skeleton className="h-40" />;
  if (!companyId) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl bg-white p-8 text-center shadow-md">
        <h1 className="text-lg font-semibold text-gray-900">{L('Select a company to view dashboard', 'اختر شركة لعرض لوحة المعلومات')}</h1>
        <p className="mt-2 text-sm text-gray-500">{L('Use the company selector in the top bar.', 'استخدم قائمة الشركات في الشريط العلوي.')}</p>
      </div>
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
  const profit = d ? Number(d.netProfit) : 0;
  const chart = series.map((s, i) => {
    const b = monthBounds([5, 4, 3, 2, 1, 0][i]);
    return { month: b.label, revenue: Number(s.data?.totalRevenue ?? 0), expenses: Number(s.data?.totalExpenses ?? 0) };
  });
  const names = new Map((customers.data ?? []).map((c) => [c.id, c.name]));
  const top = (ytd.data?.topCustomers ?? []).slice(0, 5).map((c) => {
    const name = L(c.nameEn, c.nameAr);
    return { name: name.length > 20 ? `${name.slice(0, 20)}…` : name, amount: Number(c.totalAmount) };
  });
  const t = aging.data?.totals ?? {};
  const agingRows = [
    { label: L('Current (0–30 days)', 'حالية (0–30 يوما)'), value: t.current, color: '#10B981' },
    { label: L('31–60 days', '31–60 يوما'), value: t.d31_60, color: '#F59E0B' },
    { label: L('61–90 days', '61–90 يوما'), value: t.d61_90, color: '#F97316' },
    { label: L('91–120 days', '91–120 يوما'), value: t.d91_120, color: '#EF4444' },
    { label: L('Over 120 days', 'أكثر من 120 يوما'), value: t.d120plus, color: '#991B1B' },
  ];
  const agingTotal = Number(t.total ?? 0);

  return (
    <div className="-m-4 min-h-screen bg-gray-50 p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{L('Dashboard', 'لوحة المعلومات')}</h1>
          <p className="mt-1 text-sm text-gray-500">{L(`Month to date · ${month.label}`, `الشهر الحالي · ${month.label}`)}</p>
        </header>

        {/* KPIs: 3 cols lg, 2 md, 1 sm */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {!d ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />) : (
            <>
              <Kpi label={L('Revenue (this month)', 'إيرادات الشهر')} value={fmt(d.totalRevenue)} accent="#1E4FC2" icon={TrendingUp} trend={L('↑ This month', '↑ هذا الشهر')} />
              <Kpi label={L('Receivables', 'الذمم المدينة')} value={fmt(d.outstandingReceivables)} accent="#F59E0B" icon={Clock} trend={L('↑ Outstanding', '↑ مستحقة')} />
              <Kpi label={L('Net Profit (this month)', 'صافي الربح')} value={fmt(d.netProfit)} accent="#10B981" icon={Banknote} tone={profit >= 0 ? 'text-emerald-600' : 'text-red-600'} trend={L('↑ This month', '↑ هذا الشهر')} />
              <Kpi label={L('Cash Balance', 'النقد')} value={fmt(d.cashBalance)} accent="#6366F1" icon={Wallet} trend={L('↑ Current', '↑ الحالي')} />
              <Kpi label={L('Payables', 'الذمم الدائنة')} value={fmt(d.outstandingPayables)} accent="#EF4444" icon={TrendingDown} trend={L('↑ Outstanding', '↑ مستحقة')} />
            </>
          )}
          {employees.data === undefined ? <Skeleton className="h-32" /> : (
            <Kpi label={L('Employees', 'الموظفون')} value={String(employees.data)} accent="#8B5CF6" icon={UserRound} trend={L('↑ Active', '↑ نشطون')} />
          )}
        </div>

        <div className="mb-6 mt-8 border-t border-gray-200" />

        {/* Chart 60% | Recent invoices 40% on lg */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card title={L('Revenue vs Expenses', 'الإيرادات مقابل المصروفات')} subtitle={L('Last 6 months', 'آخر 6 أشهر')} className="lg:col-span-3">
            {series.some((s) => s.isLoading) ? <Skeleton className="h-[280px]" /> : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1E4FC2" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#1E4FC2" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={kTick} tick={{ fontSize: 12, fill: '#6B7280' }} width={80} />
                      <Tooltip formatter={(v) => aed.format(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#1E4FC2" strokeWidth={2} fill="url(#gRev)" name={L('Revenue', 'الإيرادات')} />
                      <Area type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" fill="none" name={L('Expenses', 'المصروفات')} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs font-medium text-gray-600">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1"><span className="h-2 w-2 rounded-full bg-[#1E4FC2]" />{L('Revenue', 'الإيرادات')}</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" />{L('Expenses', 'المصروفات')}</span>
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
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.data.map((inv) => (
                      <tr key={inv.id} className="border-b border-gray-100 transition-colors hover:bg-blue-50">
                        <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{inv.number}</td>
                        <td className="max-w-28 truncate px-4 py-3 font-medium text-gray-800">{names.get(inv.customerId) ?? '—'}</td>
                        <td className="px-4 py-3 text-end font-semibold text-gray-900" dir="ltr">{fmt(inv.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {inv.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{inv.date}</td>
                      </tr>
                    ))}
                    {!invoices.data.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">{L('No invoices yet', 'لا توجد فواتير بعد')}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Row 4 */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title={L('Top Customers', 'أفضل العملاء')} subtitle={L('Year to date', 'منذ بداية السنة')}>
            {ytd.isLoading ? <Skeleton className="h-64" /> : top.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">{L('No records yet', 'لا توجد سجلات بعد')}</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top} layout="vertical" margin={{ left: 8, right: 90 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1E4FC2" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip formatter={(v) => aed.format(Number(v))} />
                    <Bar dataKey="amount" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={18}>
                      <LabelList dataKey="amount" position="right" formatter={(v: unknown) => aed.format(Number(v))} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title={L('Aging Summary', 'ملخص الأعمار')} subtitle={L('Receivables by days past due', 'الذمم المدينة حسب أيام التأخير')}>
            {aging.isLoading ? <Skeleton className="h-64" /> : (
              <ul className="space-y-4">
                {agingRows.map((r) => {
                  const v = Number(r.value ?? 0);
                  const pct = agingTotal > 0 ? (v / agingTotal) * 100 : 0;
                  return (
                    <li key={r.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-600">{r.label}</span>
                        <span className="font-mono font-medium text-gray-900" dir="ltr">{fmt(v)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                      </div>
                    </li>
                  );
                })}
                <li className="border-t border-gray-100 pt-3 text-sm font-semibold text-gray-900">
                  {L('Total', 'الإجمالي')}: <span className="font-mono" dir="ltr">{fmt(agingTotal)}</span>
                </li>
              </ul>
            )}
          </Card>
        </div>

        {/* Row 5 */}
        <div className="mt-6">
          <Card title={L('Payroll Overview', 'نظرة عامة على الرواتب')} action={{ href: '/dashboard/hr/payroll', label: L('View all', 'عرض الكل') }} padded={false}>
            {!payroll.data ? <Skeleton className="m-6 h-32" /> : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-start">{L('Period', 'الفترة')}</th>
                      <th className="px-4 py-3 text-end">{L('Employees', 'الموظفون')}</th>
                      <th className="px-4 py-3 text-end">{L('Gross', 'الإجمالي')}</th>
                      <th className="px-4 py-3 text-end">{L('Net', 'الصافي')}</th>
                      <th className="px-4 py-3 text-start">{L('Status', 'الحالة')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.data.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100 transition-colors hover:bg-blue-50">
                        <td className="px-4 py-3">{`${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`}</td>
                        <td className="px-4 py-3 text-end text-gray-400">—</td>
                        <td className="px-4 py-3 text-end font-mono text-xs" dir="ltr">{fmt(p.totalGross)}</td>
                        <td className="px-4 py-3 text-end font-mono text-xs" dir="ltr">{fmt(p.totalNet)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!payroll.data.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">{L('No payroll runs yet', 'لا توجد مسيرات رواتب بعد')}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
