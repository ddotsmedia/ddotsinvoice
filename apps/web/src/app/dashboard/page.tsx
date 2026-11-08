'use client';

import type { ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, Banknote, Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { useLabel } from '@/lib/ui-helpers';

interface Dash {
  totalRevenue: string; totalExpenses: string; netProfit: string; outstandingReceivables: string; outstandingPayables: string; cashBalance: string;
  topCustomers: { customerId: string; nameEn: string; nameAr: string; totalAmount: string }[];
  revenueByMonth: { month: string; revenue: string }[];
}

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string) => aed.format(Number(money(v).toFixed(2)));
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-3 ${className}`} />;
}

interface Kpi { key: string; label: string; value: string | undefined; color: string; icon: ComponentType<{ className?: string }>; tone?: string }

export default function DashboardPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const dash = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<Dash>('/reports/dashboard', { params: { fromDate: `${y}-01-01`, toDate: new Date().toISOString().slice(0, 10) } })).data,
  });
  const d = dash.data;
  const profit = d ? Number(d.netProfit) : 0;

  const kpis: Kpi[] = [
    { key: 'rev', label: L('Revenue', 'الإيرادات'), value: d?.totalRevenue, color: '#2563EB', icon: TrendingUp },
    { key: 'exp', label: L('Expenses', 'المصروفات'), value: d?.totalExpenses, color: '#EF4444', icon: TrendingDown },
    { key: 'net', label: L('Net Profit', 'صافي الربح'), value: d?.netProfit, color: '#10B981', icon: DollarSign, tone: profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
    { key: 'ar', label: L('Receivables', 'الذمم المدينة'), value: d?.outstandingReceivables, color: '#F59E0B', icon: Clock },
    { key: 'ap', label: L('Payables', 'الذمم الدائنة'), value: d?.outstandingPayables, color: '#8B5CF6', icon: AlertCircle },
    { key: 'cash', label: L('Cash', 'النقد'), value: d?.cashBalance, color: '#06B6D4', icon: Banknote },
  ];
  const chart = (d?.revenueByMonth ?? []).map((r) => ({ month: r.month, revenue: Number(r.revenue) }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{L('Dashboard', 'لوحة المعلومات')}</h1>
        <p className="mt-0.5 text-sm text-secondary">{L(`Year to date ${y}`, `منذ بداية ${y}`)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!d && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        {d && kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.key} className="relative overflow-hidden rounded-xl bg-white p-5 shadow-card dark:bg-slate-900" style={{ borderLeft: `4px solid ${k.color}` }}>
              <div className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: `${k.color}1a`, color: k.color }}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-sm text-secondary">{k.label}</div>
              <div className={`mt-2 font-mono text-3xl font-bold ${k.tone ?? 'text-primary'}`} dir="ltr">{k.value ? fmt(k.value) : '—'}</div>
              <span className="mt-3 inline-flex rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-medium text-secondary">{L('YTD', 'منذ بداية السنة')}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-card dark:bg-slate-900">
        <h2 className="mb-3 font-semibold text-primary">{L('Revenue trend', 'اتجاه الإيرادات')}</h2>
        <div className="h-72">
          {!d ? (
            <Skeleton className="h-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => aed.format(Number(v))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-card dark:bg-slate-900">
        <h2 className="px-5 py-4 font-semibold text-primary">{L('Top customers', 'أفضل العملاء')}</h2>
        <ul className="divide-y divide-border">
          {d?.topCustomers.map((c) => (
            <li key={c.customerId} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">{initials(c.nameEn)}</div>
              <div className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{L(c.nameEn, c.nameAr)}</div>
              <div className="font-mono text-sm font-semibold text-primary" dir="ltr">{fmt(c.totalAmount)}</div>
            </li>
          ))}
          {d && !d.topCustomers.length && <li className="px-5 py-8 text-center text-sm text-muted">{L('No records yet', 'لا توجد سجلات بعد')}</li>}
        </ul>
      </div>
    </div>
  );
}
