'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId } from '@/lib/company';
import { useLabel, errMsg } from '@/lib/ui-helpers';

interface PlRow { month: string; revenue: string; expenses: string; netProfit: string }
interface InvoiceMonthRow { month: string; invoiced: string; paid: string; outstanding: string }
interface RevenueRow { accountId: string; code: string; nameEn: string; nameAr: string; amount: string }
interface InvoiceBucket { count: number; amount: string }
interface InvoiceSummary { paid: InvoiceBucket; outstanding: InvoiceBucket; overdue: InvoiceBucket; draft: InvoiceBucket; totalValue: string; forecast: string }

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : aed.format(Number(money(String(v)).toFixed(2))));
const kTick = (v: number) => `AED ${(v / 1000).toFixed(0)}K`;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = ymd(new Date());
const yearStart = `${new Date().getUTCFullYear()}-01-01`;

const SLICE_COLORS = { paid: '#10B981', outstanding: '#3B82F6', overdue: '#EF4444', draft: '#9CA3AF' };

const monthLabel = (ym: string, locale: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl bg-white shadow-md ${className}`}>
      <header className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function ReportsOverviewPage() {
  const L = useLabel();
  const { user } = useAuth({ fetchUser: true });
  const companyId = useActiveCompanyId(user);
  const on = !!companyId;

  const pl = useQuery({
    queryKey: ['reports', companyId, 'pl-monthly', todayStr],
    enabled: on,
    queryFn: async () => (await api.get<PlRow[]>('/reports/pl-monthly', { params: { toDate: todayStr } })).data,
  });
  const invMonthly = useQuery({
    queryKey: ['reports', companyId, 'invoice-monthly', todayStr],
    enabled: on,
    queryFn: async () => (await api.get<InvoiceMonthRow[]>('/reports/invoice-monthly', { params: { toDate: todayStr } })).data,
  });
  const revenue = useQuery({
    queryKey: ['reports', companyId, 'revenue-breakdown', yearStart, todayStr],
    enabled: on,
    queryFn: async () => (await api.get<RevenueRow[]>('/reports/revenue-breakdown', { params: { fromDate: yearStart, toDate: todayStr } })).data,
  });
  const summary = useQuery({
    queryKey: ['reports', companyId, 'invoice-summary'],
    enabled: on,
    queryFn: async () => (await api.get<InvoiceSummary>('/reports/invoice-summary')).data,
  });

  if (!user) return <Skeleton className="h-40" />;
  if (!companyId) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl bg-white p-8 text-center shadow-md">
        <h1 className="text-lg font-semibold text-gray-900">{L('Select a company to view reports', 'اختر شركة لعرض التقارير')}</h1>
        <p className="mt-2 text-sm text-gray-500">{L('Use the company selector in the top bar.', 'استخدم قائمة الشركات في الشريط العلوي.')}</p>
      </div>
    );
  }

  const failed = [pl, invMonthly, revenue, summary].find((q) => q.error);
  if (failed?.error) {
    const msg = errMsg(failed.error);
    const isCompanyCtx = typeof msg === 'string' && msg.toLowerCase().includes('company context');
    return (
      <div className="rounded-xl bg-white p-6 text-sm shadow-md">
        <div className="font-semibold text-gray-900">{L('Reports could not be loaded', 'تعذر تحميل التقارير')}</div>
        <div className="text-gray-500">{msg}</div>
        {isCompanyCtx && (
          <p className="mt-3 text-xs text-gray-400">
            {L(
              'Your session may be outdated. Try signing out and back in to refresh your company access.',
              'قد تكون جلستك قديمة. حاول تسجيل الخروج والدخول مجددًا لتحديث صلاحية الشركة.',
            )}
          </p>
        )}
      </div>
    );
  }

  // Section 1 — P&L, 12 months (AED K axis)
  const plData = (pl.data ?? []).map((r) => ({
    month: monthLabel(r.month, 'en-GB'),
    Revenue: Number(r.revenue),
    Expenses: Number(r.expenses),
    'Net Profit': Number(r.netProfit),
  }));

  // Section 2 — revenue by category (top 8, already sorted desc by API)
  const revData = (revenue.data ?? []).map((r) => ({ name: L(r.nameEn, r.nameAr), amount: Number(r.amount) }));

  // Section 3 — invoice status donut
  const s = summary.data;
  const donut = s ? [
    { name: L('Paid', 'مدفوعة'), value: Number(s.paid.amount), color: SLICE_COLORS.paid },
    { name: L('Outstanding', 'مستحقة'), value: Number(s.outstanding.amount), color: SLICE_COLORS.outstanding },
    { name: L('Overdue', 'متأخرة'), value: Number(s.overdue.amount), color: SLICE_COLORS.overdue },
    { name: L('Draft', 'مسودة'), value: Number(s.draft.amount), color: SLICE_COLORS.draft },
  ] : [];

  // Section 4 — last 6 months summary table
  const invByMonth = new Map((invMonthly.data ?? []).map((r) => [r.month, r]));
  const tableRows = (pl.data ?? []).slice(-6).map((r) => {
    const inv = invByMonth.get(r.month);
    const net = Number(r.netProfit);
    return {
      month: monthLabel(r.month, 'en-GB'),
      invoiced: inv?.invoiced ?? '0',
      paid: inv?.paid ?? '0',
      outstanding: inv?.outstanding ?? '0',
      expenses: r.expenses,
      net,
    };
  });

  return (
    <div className="-m-4 min-h-screen bg-gray-100 p-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{L('Reports', 'التقارير')}</h1>
          <p className="mt-1 text-sm text-gray-500">{L('P&L, revenue mix, invoice status and monthly summary', 'الأرباح والخسائر، مزيج الإيرادات، حالة الفواتير والملخص الشهري')}</p>
        </header>

        {/* Section 1 — P&L chart */}
        <Card title={L('Profit & Loss', 'الأرباح والخسائر')} subtitle={L('Last 12 months · AED K', 'آخر 12 شهرا · ألف درهم')}>
          {pl.isLoading ? <Skeleton className="h-[320px]" /> : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={plData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={kTick} tick={{ fontSize: 12, fill: '#6B7280' }} width={80} />
                  <Tooltip formatter={(val, name) => [`AED ${Number(val).toLocaleString('en-AE')}`, String(name)]} contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }} />
                  <Legend iconType="square" wrapperStyle={{ paddingTop: 12 }} />
                  <Bar dataKey="Revenue" name={L('Revenue', 'الإيرادات')} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" name={L('Expenses', 'المصروفات')} fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Net Profit" name={L('Net Profit', 'صافي الربح')} stroke="#10B981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Section 2 — revenue by category */}
          <Card title={L('Revenue by Category', 'الإيرادات حسب الفئة')} subtitle={L('Top 8 · year to date', 'أعلى 8 · منذ بداية السنة')}>
            {revenue.isLoading ? <Skeleton className="h-[300px]" /> : revData.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">{L('No revenue recorded yet', 'لا توجد إيرادات مسجلة بعد')}</div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revData} layout="vertical" margin={{ left: 8, right: 90 }}>
                    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={kTick} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip formatter={(v) => `AED ${Number(v).toLocaleString('en-AE')}`} />
                    <Bar dataKey="amount" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Section 3 — invoice summary donut */}
          <Card title={L('Invoice Summary', 'ملخص الفواتير')} subtitle={L('By status · all time', 'حسب الحالة · كل الفترات')}>
            {summary.isLoading ? <Skeleton className="h-[300px]" /> : (
              <div>
                <div className="relative h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} stroke="none">
                        {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => aed.format(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500">{L('Total', 'الإجمالي')}</span>
                    <span className="font-mono text-sm font-bold text-gray-900" dir="ltr">{fmt(s?.totalValue)}</span>
                  </div>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {donut.map((d) => (
                    <li key={d.name} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                      <span className="font-mono text-gray-900" dir="ltr">{fmt(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        {/* Section 4 — summary table */}
        <Card title={L('Monthly Summary', 'الملخص الشهري')} subtitle={L('Last 6 months · AED', 'آخر 6 أشهر · درهم')}>
          {pl.isLoading || invMonthly.isLoading ? <Skeleton className="h-64" /> : (
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-start">{L('Month', 'الشهر')}</th>
                    <th className="px-4 py-3 text-end">{L('Invoiced', 'المفوتر')}</th>
                    <th className="px-4 py-3 text-end">{L('Paid', 'المدفوع')}</th>
                    <th className="px-4 py-3 text-end">{L('Outstanding', 'المستحق')}</th>
                    <th className="px-4 py-3 text-end">{L('Expenses', 'المصروفات')}</th>
                    <th className="px-4 py-3 text-end">{L('Net', 'الصافي')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r, i) => (
                    <tr key={r.month} className={`border-t border-gray-100 ${i % 2 ? 'bg-gray-50/50' : 'bg-white'}`}>
                      <td className="px-4 py-2 text-gray-800">{r.month}</td>
                      <td className="px-4 py-2 text-end font-mono text-gray-800" dir="ltr">{fmt(r.invoiced)}</td>
                      <td className="px-4 py-2 text-end font-mono text-green-700" dir="ltr">{fmt(r.paid)}</td>
                      <td className="px-4 py-2 text-end font-mono text-amber-700" dir="ltr">{fmt(r.outstanding)}</td>
                      <td className="px-4 py-2 text-end font-mono text-gray-700" dir="ltr">{fmt(r.expenses)}</td>
                      <td className={`px-4 py-2 text-end font-mono font-semibold ${r.net >= 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">{fmt(r.net)}</td>
                    </tr>
                  ))}
                  {tableRows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">{L('No data', 'لا توجد بيانات')}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
