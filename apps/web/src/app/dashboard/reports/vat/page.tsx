'use client';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface QuarterData { label: string; outputVat: string; inputVat: string; netVat: string }
interface VatDashboard {
  currentQuarter: QuarterData & { filingDeadline: string; daysUntilDeadline: number };
  previousQuarters: QuarterData[];
  topVatableCustomers: Array<{ name: string; vatAmount: string }>;
  topVatableSuppliers: Array<{ name: string; vatAmount: string }>;
}

function fmt(v: string) { return `AED ${money(v).toFixed(2)}`; }

function downloadCsv(filename: string, data: string[][]) {
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function VatDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['vat-dashboard'],
    queryFn: async () => (await api.get<VatDashboard>('/reports/vat-dashboard')).data,
  });

  const days = data?.currentQuarter.daysUntilDeadline ?? 0;
  const deadlineColor = days > 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : days > 15 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

  const chartData = data
    ? [...(data.previousQuarters ?? []).slice().reverse(), data.currentQuarter].map((q) => ({
        name: q.label.split(' ').slice(0, 2).join(' '),
        'Output VAT': Number(q.outputVat),
        'Input VAT': Number(q.inputVat),
      }))
    : [];

  const netVat = data ? Number(data.currentQuarter.netVat) : 0;

  const handleExport = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Quarter', 'Output VAT', 'Input VAT', 'Net VAT'],
      ...[...data.previousQuarters.slice().reverse(), data.currentQuarter].map((q) => [q.label, q.outputVat, q.inputVat, q.netVat]),
    ];
    downloadCsv('vat-dashboard.csv', rows);
  };

  if (isLoading) return <div className="text-muted text-sm p-8">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">VAT Dashboard</h1>
          {data && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${deadlineColor}`}>
              {days > 0 ? `${days} days until filing` : 'Filing overdue'}
            </span>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`${cardCls} p-5`}>
              <div className="text-sm text-muted mb-1">Output VAT (Sales)</div>
              <div className="text-2xl font-bold font-mono" dir="ltr">{fmt(data.currentQuarter.outputVat)}</div>
              <div className="text-xs text-muted mt-1">{data.currentQuarter.label}</div>
            </div>
            <div className={`${cardCls} p-5`}>
              <div className="text-sm text-muted mb-1">Input VAT (Purchases)</div>
              <div className="text-2xl font-bold font-mono" dir="ltr">{fmt(data.currentQuarter.inputVat)}</div>
              <div className="text-xs text-muted mt-1">{data.currentQuarter.label}</div>
            </div>
            <div className={`${cardCls} p-5 ${netVat >= 0 ? 'border-red-200 dark:border-red-800' : 'border-green-200 dark:border-green-800'}`}>
              <div className="text-sm text-muted mb-1">Net VAT Position</div>
              <div className={`text-2xl font-bold font-mono ${netVat >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} dir="ltr">
                {fmt(data.currentQuarter.netVat)}
              </div>
              <div className="text-xs text-muted mt-1">{netVat >= 0 ? 'Payable to FTA' : 'Refund due'}</div>
            </div>
          </div>

          {/* Deadline countdown */}
          <div className={`${cardCls} p-5`}>
            <div className="text-sm text-muted mb-1">Filing Deadline</div>
            <div className="text-4xl font-bold">{Math.max(0, days)}</div>
            <div className="text-sm text-muted">days until {data.currentQuarter.label} VAT return due ({data.currentQuarter.filingDeadline})</div>
          </div>

          {/* Bar chart */}
          <div className={`${cardCls} p-5`}>
            <div className="font-semibold mb-4">Quarterly VAT — Last 5 Quarters</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => `AED ${Number(v).toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Output VAT" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Input VAT" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top VAT customers & suppliers */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className={`${cardCls} p-5`}>
              <div className="font-semibold mb-3">Top VAT Customers</div>
              <table className="w-full text-sm">
                <thead><tr className="text-muted text-xs"><th className="text-start py-1">Customer</th><th className="text-end py-1">VAT Amount</th></tr></thead>
                <tbody>
                  {data.topVatableCustomers.map((c, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5">{c.name}</td>
                      <td className="py-1.5 text-end font-mono" dir="ltr">{money(c.vatAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${cardCls} p-5`}>
              <div className="font-semibold mb-3">Top VAT Suppliers</div>
              <table className="w-full text-sm">
                <thead><tr className="text-muted text-xs"><th className="text-start py-1">Supplier</th><th className="text-end py-1">VAT Amount</th></tr></thead>
                <tbody>
                  {data.topVatableSuppliers.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5">{s.name}</td>
                      <td className="py-1.5 text-end font-mono" dir="ltr">{money(s.vatAmount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
