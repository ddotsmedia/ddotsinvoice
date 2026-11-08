'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Banknote, Clock, TrendingDown, TrendingUp, UserRound, Wallet } from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId } from '@/lib/company';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { cardCls, StatusBadge } from '@/components/ui';

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

/** Calendar month `offset` months back (0 = current), UTC. */
const monthBounds = (offset: number) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { from: ymd(start), to: ymd(end), label: start.toLocaleString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) };
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-3 ${className}`} />;
}

function Kpi({ label, value, color, icon: Icon, tone }: { label: string; value: string; color: string; icon: ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <div className={`${cardCls} relative overflow-hidden p-5`} style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${color}1a`, color }}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm text-secondary">{label}</div>
      <div className={`mt-1 font-mono text-3xl font-bold ${tone ?? 'text-primary'}`} dir="ltr">{value}</div>
    </div>
  );
}

function Card({ title, action, children, className = '' }: { title: string; action?: { href: string; label: string }; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardCls} overflow-hidden ${className}`}>
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-semibold text-primary">{title}</h2>
        {action && <Link href={action.href} className="text-sm font-medium text-brand-600 hover:underline">{action.label}</Link>}
      </header>
      <div className="p-5">{children}</div>
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
    queryFn: async () => (await api.get<{ items: { id: string; name: string }[] }>('/invoicing/customers', { params: { limit: 200 } })).data.items,
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
      <div className={`${cardCls} mx-auto mt-10 max-w-md p-8 text-center`}>
        <h1 className="text-lg font-semibold text-primary">{L('Select a company to view dashboard', 'اختر شركة لعرض لوحة المعلومات')}</h1>
        <p className="mt-2 text-sm text-secondary">{L('Use the company selector in the top bar.', 'استخدم قائمة الشركات في الشريط العلوي.')}</p>
      </div>
    );
  }

  const failed = [kpi, ytd, invoices, customers, aging, payroll, employees].find((q) => q.error);
  if (failed?.error) {
    return (
      <div className={`${cardCls} flex items-start gap-3 p-6 text-sm`}>
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div>
          <div className="font-semibold text-primary">{L('Dashboard data could not be loaded', 'تعذر تحميل بيانات اللوحة')}</div>
          <div className="text-secondary">{errMsg(failed.error)}</div>
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
  const top = (ytd.data?.topCustomers ?? []).slice(0, 5).map((c) => ({ name: L(c.nameEn, c.nameAr), amount: Number(c.totalAmount) }));
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{L('Dashboard', 'لوحة المعلومات')}</h1>
        <p className="mt-0.5 text-sm text-secondary">{L(`Month to date · ${month.label}`, `الشهر الحالي · ${month.label}`)}</p>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!d ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />) : (
          <>
            <Kpi label={L('Total Revenue (this month)', 'إيرادات الشهر')} value={fmt(d.totalRevenue)} color="#2563EB" icon={TrendingUp} />
            <Kpi label={L('Outstanding Receivables', 'الذمم المدينة')} value={fmt(d.outstandingReceivables)} color="#F59E0B" icon={Clock} />
            <Kpi label={L('Net Profit (this month)', 'صافي الربح')} value={fmt(d.netProfit)} color="#10B981" icon={Banknote} tone={profit >= 0 ? 'text-emerald-600' : 'text-red-600'} />
            <Kpi label={L('Cash Balance', 'النقد')} value={fmt(d.cashBalance)} color="#06B6D4" icon={Wallet} />
          </>
        )}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!d ? <Skeleton className="h-32" /> : <Kpi label={L('Outstanding Payables', 'الذمم الدائنة')} value={fmt(d.outstandingPayables)} color="#8B5CF6" icon={TrendingDown} />}
        {employees.data === undefined ? <Skeleton className="h-32" /> : (
          <Kpi label={L('Active Employees', 'الموظفون النشطون')} value={String(employees.data)} color="#6366F1" icon={UserRound} />
        )}
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card title={L('Revenue vs Expenses (6 months)', 'الإيرادات مقابل المصروفات (6 أشهر)')} className="lg:col-span-3">
          {series.some((s) => s.isLoading) ? <Skeleton className="h-72" /> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => aed.format(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" name={L('Revenue', 'الإيرادات')} stroke="#2563EB" strokeWidth={2} fill="url(#gRev)" />
                  <Area type="monotone" dataKey="expenses" name={L('Expenses', 'المصروفات')} stroke="#EF4444" strokeWidth={2} fill="url(#gExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={L('Recent Invoices', 'أحدث الفواتير')} action={{ href: '/dashboard/invoicing/invoices?type=invoice', label: L('View all', 'عرض الكل') }} className="lg:col-span-2">
          {!invoices.data ? <Skeleton className="h-72" /> : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-xs uppercase text-secondary">
                  <tr>
                    <th className="px-3 py-2 text-start">{L('Invoice #', 'رقم')}</th>
                    <th className="px-3 py-2 text-start">{L('Customer', 'العميل')}</th>
                    <th className="px-3 py-2 text-end">{L('Amount', 'المبلغ')}</th>
                    <th className="px-3 py-2 text-start">{L('Status', 'الحالة')}</th>
                    <th className="px-3 py-2 text-start">{L('Date', 'التاريخ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.data.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-2 font-mono text-xs">{inv.number}</td>
                      <td className="max-w-28 truncate px-3 py-2">{names.get(inv.customerId) ?? '—'}</td>
                      <td className="px-3 py-2 text-end font-mono text-xs" dir="ltr">{fmt(inv.total)}</td>
                      <td className="px-3 py-2"><StatusBadge status={inv.status} /></td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">{inv.date}</td>
                    </tr>
                  ))}
                  {!invoices.data.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted">{L('No invoices yet', 'لا توجد فواتير بعد')}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={L('Top Customers (year to date)', 'أفضل العملاء (منذ بداية السنة)')}>
          {ytd.isLoading ? <Skeleton className="h-64" /> : top.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted">{L('No records yet', 'لا توجد سجلات بعد')}</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} layout="vertical" margin={{ left: 8, right: 90 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => aed.format(Number(v))} />
                  <Bar dataKey="amount" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={18}>
                    <LabelList dataKey="amount" position="right" formatter={(v: unknown) => aed.format(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={L('Aging Summary (receivables)', 'ملخص أعمار الذمم المدينة')}>
          {aging.isLoading ? <Skeleton className="h-64" /> : (
            <ul className="space-y-4">
              {agingRows.map((r) => {
                const v = Number(r.value ?? 0);
                const pct = agingTotal > 0 ? (v / agingTotal) * 100 : 0;
                return (
                  <li key={r.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-secondary">{r.label}</span>
                      <span className="font-mono font-medium text-primary" dir="ltr">{fmt(v)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                    </div>
                  </li>
                );
              })}
              <li className="border-t border-border pt-3 text-sm font-semibold text-primary">
                {L('Total', 'الإجمالي')}: <span className="font-mono" dir="ltr">{fmt(agingTotal)}</span>
              </li>
            </ul>
          )}
        </Card>
      </div>

      {/* Row 5 */}
      <Card title={L('Payroll Overview', 'نظرة عامة على الرواتب')} action={{ href: '/dashboard/hr/payroll', label: L('View all', 'عرض الكل') }}>
        {!payroll.data ? <Skeleton className="h-32" /> : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-secondary">
                <tr>
                  <th className="px-4 py-2 text-start">{L('Period', 'الفترة')}</th>
                  <th className="px-4 py-2 text-end">{L('Employees', 'الموظفون')}</th>
                  <th className="px-4 py-2 text-end">{L('Gross', 'الإجمالي')}</th>
                  <th className="px-4 py-2 text-end">{L('Net', 'الصافي')}</th>
                  <th className="px-4 py-2 text-start">{L('Status', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payroll.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">{`${String(p.periodMonth).padStart(2, '0')}/${p.periodYear}`}</td>
                    <td className="px-4 py-2 text-end text-muted">—</td>
                    <td className="px-4 py-2 text-end font-mono text-xs" dir="ltr">{fmt(p.totalGross)}</td>
                    <td className="px-4 py-2 text-end font-mono text-xs" dir="ltr">{fmt(p.totalNet)}</td>
                    <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
                {!payroll.data.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{L('No payroll runs yet', 'لا توجد مسيرات رواتب بعد')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
