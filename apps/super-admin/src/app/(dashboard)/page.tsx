'use client';

import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { fmtAed } from '@/lib/format';
import { Badge, cardCls, PageHeader } from '@/components/ui';

interface Stats {
  totalTenants: number; totalCompanies: number; totalUsers: number; totalInvoices: number;
  totalInvoiceValue: string; revenueThisMonth: string;
  signupsLast30: { date: string; count: number }[];
  health: { api: 'ok' | 'error'; db: 'ok' | 'error'; redis: 'ok' | 'error' };
}

export default function OverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<Stats>('/super-admin/stats')).data,
    refetchInterval: 30_000,
  });

  const cards = data
    ? [
        { label: 'Tenants', value: data.totalTenants },
        { label: 'Companies', value: data.totalCompanies },
        { label: 'Users', value: data.totalUsers },
        { label: 'Invoices', value: data.totalInvoices, sub: fmtAed(data.totalInvoiceValue) },
        { label: 'Revenue (this month)', value: fmtAed(data.revenueThisMonth) },
      ]
    : [];

  return (
    <>
      <PageHeader title="Platform Overview" subtitle="Live figures across all tenants" />
      {isError && <p className="mb-4 text-sm text-red-600">Failed to load platform stats.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading && Array.from({ length: 5 }).map((_, i) => <div key={i} className={`${cardCls} h-28 animate-pulse`} />)}
        {cards.map((c) => (
          <div key={c.label} className={`${cardCls} p-5`}>
            <div className="text-sm text-secondary">{c.label}</div>
            <div className="mt-2 font-mono text-2xl font-bold text-primary">{c.value}</div>
            {c.sub && <div className="mt-1 text-xs text-secondary">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardCls} p-5 xl:col-span-2`}>
          <h2 className="mb-3 font-semibold text-primary">New signups — last 30 days</h2>
          <div className="h-72">
            {data && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.signupsLast30}>
                  <defs>
                    <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#signupFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className="mb-4 font-semibold text-primary">System health</h2>
          <ul className="space-y-3 text-sm">
            {(['api', 'db', 'redis'] as const).map((k) => (
              <li key={k} className="flex items-center justify-between">
                <span className="uppercase text-secondary">{k}</span>
                {data ? <Badge value={data.health[k]} label={data.health[k] === 'ok' ? 'Operational' : 'Down'} /> : <span className="text-muted">…</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
