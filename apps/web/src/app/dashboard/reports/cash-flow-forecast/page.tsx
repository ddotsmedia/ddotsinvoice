'use client';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface WeekForecast {
  week: string;
  expectedInflows: string;
  expectedOutflows: string;
  netCashFlow: string;
  runningBalance: string;
}

interface CashFlowForecast {
  currentBalance: string;
  forecast: WeekForecast[];
  assumptions: { collectionRate: number; paymentRate: number };
}

function fmt(v: string) { return money(v).toFixed(2); }

function downloadCsv(filename: string, data: string[][]) {
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function CashFlowForecastPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow-forecast'],
    queryFn: async () => (await api.get<CashFlowForecast>('/reports/cash-flow-forecast')).data,
  });

  const chartData = data?.forecast.map((w, i) => ({
    name: `W${i + 1}`,
    balance: Number(w.runningBalance),
  })) ?? [];

  const handleExport = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Week', 'Expected Inflows', 'Expected Outflows', 'Net Cash Flow', 'Running Balance'],
      ...data.forecast.map((w) => [w.week, w.expectedInflows, w.expectedOutflows, w.netCashFlow, w.runningBalance]),
    ];
    downloadCsv('cash-flow-forecast.csv', rows);
  };

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">12-Week Cash Flow Forecast</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {data && (
        <>
          {/* Current balance hero */}
          <div className={`${cardCls} p-6`}>
            <div className="text-sm text-muted mb-1">Current Cash Balance</div>
            <div className="text-4xl font-bold font-mono" dir="ltr">AED {fmt(data.currentBalance)}</div>
          </div>

          {/* Area chart */}
          <div className={`${cardCls} p-5`}>
            <div className="font-semibold mb-4">12-Week Running Balance</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => `AED ${Number(v).toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} fill="url(#balanceFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted">
              Based on {Math.round(data.assumptions.collectionRate * 100)}% collection rate and {Math.round(data.assumptions.paymentRate * 100)}% payment rate
            </p>
          </div>

          {/* Weekly table */}
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">Week</th>
                  <th className="px-4 py-3 text-end font-medium text-green-700 dark:text-green-400">Inflows</th>
                  <th className="px-4 py-3 text-end font-medium text-red-700 dark:text-red-400">Outflows</th>
                  <th className="px-4 py-3 text-end font-medium">Net</th>
                  <th className="px-4 py-3 text-end font-medium">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.map((w, i) => {
                  const net = Number(w.netCashFlow);
                  const bal = Number(w.runningBalance);
                  return (
                    <tr key={i} className={`border-t border-border ${bal < 0 ? 'bg-red-50 dark:bg-red-950/20' : net >= 0 ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                      <td className="px-4 py-2 text-xs">{w.week}</td>
                      <td className="px-4 py-2 text-end font-mono text-green-700 dark:text-green-400" dir="ltr">{fmt(w.expectedInflows)}</td>
                      <td className="px-4 py-2 text-end font-mono text-red-700 dark:text-red-400" dir="ltr">{fmt(w.expectedOutflows)}</td>
                      <td className={`px-4 py-2 text-end font-mono ${net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} dir="ltr">{fmt(w.netCashFlow)}</td>
                      <td className={`px-4 py-2 text-end font-mono font-semibold ${bal < 0 ? 'text-red-600 dark:text-red-400' : ''}`} dir="ltr">{fmt(w.runningBalance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
