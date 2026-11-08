'use client';

import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Dash {
  totalRevenue: string; totalExpenses: string; netProfit: string; outstandingReceivables: string; outstandingPayables: string; cashBalance: string;
  topCustomers: { customerId: string; nameEn: string; nameAr: string; totalAmount: string }[];
  revenueByMonth: { month: string; revenue: string }[];
}

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string) => aed.format(Number(money(v).toFixed(2)));

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export default function DashboardPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: `${y}-01-01`, toDate: new Date().toISOString().slice(0, 10) } })).data,
  });
  const d = dash.data;
  const profit = d ? Number(d.netProfit) : 0;
  const kpis = d
    ? [
        { label: L('Revenue', 'الإيرادات'), value: fmt(d.totalRevenue), tone: '' },
        { label: L('Expenses', 'المصروفات'), value: fmt(d.totalExpenses), tone: '' },
        { label: L('Net profit', 'صافي الربح'), value: fmt(d.netProfit), tone: profit >= 0 ? 'text-green-600' : 'text-red-600' },
        { label: L('Receivables', 'الذمم المدينة'), value: fmt(d.outstandingReceivables), tone: '' },
        { label: L('Payables', 'الذمم الدائنة'), value: fmt(d.outstandingPayables), tone: '' },
        { label: L('Cash', 'النقد'), value: fmt(d.cashBalance), tone: '' },
      ]
    : [];
  const chart = (d?.revenueByMonth ?? []).map((r) => ({ month: r.month, revenue: Number(r.revenue) }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{L('Dashboard', 'لوحة المعلومات')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!d && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-5`}>
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className={`mt-2 font-mono text-2xl font-bold ${k.tone}`} dir="ltr">{k.value}</div>
          </div>
        ))}
      </div>

      <div className={`${cardCls} h-72 p-4`}>
        {!d ? (
          <Skeleton className="h-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => aed.format(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke="#1B4FD8" fill="#1B4FD8" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <h2 className="px-4 py-3 font-semibold">{L('Top customers', 'أفضل العملاء')}</h2>
        <table className="w-full text-start text-sm">
          <tbody>
            {d?.topCustomers.map((c) => (
              <tr key={c.customerId} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{L(c.nameEn, c.nameAr)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{fmt(c.totalAmount)}</td>
              </tr>
            ))}
            {d && !d.topCustomers.length && (
              <tr><td className="px-4 py-6 text-center text-slate-400">{L('No records yet', 'لا توجد سجلات بعد')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
