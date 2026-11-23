'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { accountCode: string; nameEn: string; nameAr: string; amount: string }
interface Is { revenue: Row[]; cogs: Row[]; operatingExpenses: Row[]; totalRevenue: string; totalCogs: string; grossProfit: string; totalOperatingExpenses: string; netProfit: string }

function downloadCsv(filename: string, data: string[][]) {
  const csv = data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function IncomeStatementPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({ queryKey: ['is', from, to], queryFn: async () => (await api.get<Is>('/reports/income-statement', { params: { fromDate: from, toDate: to } })).data });
  const handleExport = () => {
    if (!r.data) return;
    const rows: string[][] = [
      ['Section', 'Account Code', 'Name', 'Amount'],
      ...r.data.revenue.map((x) => ['Revenue', x.accountCode, L(x.nameEn, x.nameAr), x.amount]),
      ['Total Revenue', '', '', r.data.totalRevenue],
      ...r.data.cogs.map((x) => ['COGS', x.accountCode, L(x.nameEn, x.nameAr), x.amount]),
      ['Total COGS', '', '', r.data.totalCogs],
      ['Gross Profit', '', '', r.data.grossProfit],
      ...r.data.operatingExpenses.map((x) => ['Operating Expenses', x.accountCode, L(x.nameEn, x.nameAr), x.amount]),
      ['Total Operating Expenses', '', '', r.data.totalOperatingExpenses],
      ['Net Profit', '', '', r.data.netProfit],
    ];
    downloadCsv(`income-statement-${from}-${to}.csv`, rows);
  };

  const block = (rows: Row[], total: string, label: string) => (
    <div className="mb-4">
      {rows.map((x) => (
        <div key={x.accountCode} className="flex justify-between py-1 text-sm">
          <span>{x.accountCode} {L(x.nameEn, x.nameAr)}</span><span className="font-mono" dir="ltr">{money(x.amount).toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>{label}</span><span className="font-mono" dir="ltr">{money(total).toFixed(2)}</span></div>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Income Statement', 'قائمة الدخل')}</h1>
        <div className="flex gap-2">
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors">↓ CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted/30 transition-colors">⎙ Print</button>
        </div>
      </div>
      {r.data && (
        <div className={`${cardCls} max-w-2xl p-6`}>
          {block(r.data.revenue, r.data.totalRevenue, L('Total revenue', 'إجمالي الإيرادات'))}
          {block(r.data.cogs, r.data.totalCogs, L('Cost of sales', 'تكلفة المبيعات'))}
          <div className="mb-4 flex justify-between font-semibold" dir="ltr"><span>{L('Gross profit', 'مجمل الربح')}</span><span className="font-mono">{money(r.data.grossProfit).toFixed(2)}</span></div>
          {block(r.data.operatingExpenses, r.data.totalOperatingExpenses, L('Operating expenses', 'المصروفات التشغيلية'))}
          <div className="flex justify-between border-t-2 border-border pt-2 text-lg font-bold" dir="ltr"><span>{L('Net profit', 'صافي الربح')}</span><span className="font-mono">{money(r.data.netProfit).toFixed(2)}</span></div>
        </div>
      )}
    </div>
  );
}
