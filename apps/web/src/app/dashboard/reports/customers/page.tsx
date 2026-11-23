'use client';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

interface Customer {
  id: string; name: string; totalRevenue: string; invoiceCount: number;
  avgPaymentDays: number; outstandingBalance: string; lastInvoiceDate: string;
}
interface CustomerAnalytics {
  topCustomers: Customer[];
  paymentBehavior: { paidOnTime: number; paidLate: number; outstanding: number };
  revenueByMonth: Array<{ month: string; revenue: string }>;
}

function fmt(v: string) { return money(v).toFixed(2); }

export default function CustomerAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-analytics'],
    queryFn: async () => (await api.get<CustomerAnalytics>('/reports/customer-analytics')).data,
  });

  const totalRevenue = data?.topCustomers.reduce((s, c) => s + Number(c.totalRevenue), 0) ?? 0;
  const avgDays = data?.topCustomers.length
    ? Math.round(data.topCustomers.reduce((s, c) => s + c.avgPaymentDays, 0) / data.topCustomers.length)
    : 0;

  const pieData = data ? [
    { name: 'Paid on Time', value: data.paymentBehavior.paidOnTime, color: '#10B981' },
    { name: 'Paid Late', value: data.paymentBehavior.paidLate, color: '#F59E0B' },
    { name: 'Outstanding', value: data.paymentBehavior.outstanding, color: '#EF4444' },
  ] : [];

  const lineData = data?.revenueByMonth.map((r) => ({
    month: r.month.slice(0, 7),
    revenue: Number(r.revenue),
  })) ?? [];

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Customer Analytics</h1>

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`${cardCls} p-5`}>
              <div className="text-sm text-muted mb-1">Total Customers</div>
              <div className="text-3xl font-bold">{data.topCustomers.length}</div>
              <div className="text-xs text-muted mt-1">Top by revenue</div>
            </div>
            <div className={`${cardCls} p-5`}>
              <div className="text-sm text-muted mb-1">Total Revenue</div>
              <div className="text-3xl font-bold font-mono" dir="ltr">AED {totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-muted mt-1">All time</div>
            </div>
            <div className={`${cardCls} p-5`}>
              <div className="text-sm text-muted mb-1">Avg Payment Days</div>
              <div className="text-3xl font-bold">{avgDays}</div>
              <div className="text-xs text-muted mt-1">Days from issue to payment</div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment behavior donut */}
            <div className={`${cardCls} p-5`}>
              <div className="font-semibold mb-4">Payment Behavior</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue trend */}
            <div className={`${cardCls} p-5`}>
              <div className="font-semibold mb-4">Revenue — Last 12 Months</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => `AED ${Number(v).toFixed(2)}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top customers table */}
          <div className={`${cardCls} overflow-x-auto`}>
            <div className="px-4 py-3 font-semibold border-b border-border">Top Customers</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">#</th>
                  <th className="px-4 py-3 text-start font-medium">Customer</th>
                  <th className="px-4 py-3 text-end font-medium">Revenue</th>
                  <th className="px-4 py-3 text-end font-medium">Invoices</th>
                  <th className="px-4 py-3 text-end font-medium">Outstanding</th>
                  <th className="px-4 py-3 text-end font-medium">Last Invoice</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={c.id} className="border-t border-border hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2 text-muted text-xs">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-end font-mono" dir="ltr">{fmt(c.totalRevenue)}</td>
                    <td className="px-4 py-2 text-end">{c.invoiceCount}</td>
                    <td className={`px-4 py-2 text-end font-mono ${Number(c.outstandingBalance) > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`} dir="ltr">{fmt(c.outstandingBalance)}</td>
                    <td className="px-4 py-2 text-end text-xs text-muted" dir="ltr">{c.lastInvoiceDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
