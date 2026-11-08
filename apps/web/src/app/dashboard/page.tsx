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

export default function DashboardPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: `${y}-01-01`, toDate: new Date().toISOString().slice(0, 10) } })).data,
  });
  const d = dash.data;
  const kpis = [
    { label: L('Revenue', 'الإيرادات'), value: d?.totalRevenue },
    { label: L('Expenses', 'المصروفات'), value: d?.totalExpenses },
    { label: L('Net profit', 'صافي الربح'), value: d?.netProfit },
    { label: L('Receivables', 'الذمم المدينة'), value: d?.outstandingReceivables },
    { label: L('Payables', 'الذمم الدائنة'), value: d?.outstandingPayables },
    { label: L('Cash', 'النقد'), value: d?.cashBalance },
  ];
  const chart = (d?.revenueByMonth ?? []).map((r) => ({ month: r.month, revenue: Number(r.revenue) }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{L('Dashboard', 'لوحة المعلومات')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-5`}>
            <div className="text-sm text-slate-500">{k.label}</div>
            <div className="mt-2 font-mono text-2xl font-bold" dir="ltr">{k.value ? money(k.value).toFixed(2) : '—'}</div>
          </div>
        ))}
      </div>
      <div className={`${cardCls} h-72 p-4`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#1B4FD8" fill="#1B4FD8" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <h2 className="px-4 py-3 font-semibold">{L('Top customers', 'أفضل العملاء')}</h2>
        <table className="w-full text-start text-sm">
          <tbody>
            {d?.topCustomers.map((c) => (
              <tr key={c.customerId} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{L(c.nameEn, c.nameAr)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(c.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
