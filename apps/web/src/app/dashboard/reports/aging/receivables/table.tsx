'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { partyId: string; nameEn: string; nameAr: string; current: string; d31_60: string; d61_90: string; d91_120: string; d120plus: string; total: string }
interface Aging { rows: Row[]; totals: Record<string, string> }

function downloadCsv(filename: string, data: string[][]) {
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function AgingTable({ kind }: { kind: 'receivables' | 'payables' }) {
  const L = useLabel();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({
    queryKey: ['aging', kind, asOf],
    queryFn: async () => (await api.get<Aging>(`/reports/aging/${kind}`, { params: { asOfDate: asOf } })).data,
  });
  const handleExport = () => {
    if (!r.data) return;
    const cols: Array<keyof Row> = ['current', 'd31_60', 'd61_90', 'd91_120', 'd120plus', 'total'];
    const header = ['Party', '0-30', '31-60', '61-90', '91-120', '120+', 'Total'];
    const rows: string[][] = [header, ...r.data.rows.map((x) => [L(x.nameEn, x.nameAr), ...cols.map((c) => x[c] as string)])];
    downloadCsv(`aging-${kind}-${asOf}.csv`, rows);
  };

  const cols: [keyof Row, string][] = [
    ['current', L('0–30 / current', 'حالي (0–30)')], ['d31_60', '31–60'], ['d61_90', '61–90'], ['d91_120', '91–120'], ['d120plus', '120+'], ['total', L('Total', 'الإجمالي')],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{kind === 'receivables' ? L('Receivables Aging', 'أعمار الذمم المدينة') : L('Payables Aging', 'أعمار الذمم الدائنة')}</h1>
        <div className="flex gap-2">
          <input type="date" dir="ltr" className={`${inputCls} w-48`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors">↓ CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors">⎙ Print</button>
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Party', 'الطرف')}</th>
              {cols.map(([, label]) => <th key={label} className="px-4 py-3 text-end font-medium">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.data?.rows.map((x) => (
              <tr key={x.partyId} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{L(x.nameEn, x.nameAr)}</td>
                {cols.map(([k]) => <td key={k} className="px-4 py-2 text-end font-mono" dir="ltr">{money(x[k] as string).toFixed(2)}</td>)}
              </tr>
            ))}
            {r.data && (
              <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
                <td className="px-4 py-2">{L('Totals', 'الإجمالي')}</td>
                {cols.map(([k]) => <td key={k} className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.data!.totals[k] ?? '0').toFixed(2)}</td>)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
