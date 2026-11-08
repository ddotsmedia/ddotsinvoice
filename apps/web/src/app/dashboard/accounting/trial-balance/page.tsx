'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { FiscalYear, TrialBalance } from '@/lib/accounting-types';

export default function TrialBalancePage() {
  const L = useLabel();
  const [fyId, setFyId] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const years = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: async () => (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data,
  });
  const selected = fyId || years.data?.[0]?.id || '';

  const tb = useQuery({
    queryKey: ['trial-balance', selected, asOf],
    enabled: !!selected,
    queryFn: async () =>
      (await api.get<TrialBalance>('/accounting/reports/trial-balance', { params: { fiscalYearId: selected, asOf } })).data,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('Trial Balance', 'ميزان المراجعة')}</h1>
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <select className={inputCls} value={selected} onChange={(e) => setFyId(e.target.value)}>
          {years.data?.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <input type="date" dir="ltr" className={inputCls} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Account', 'الحساب')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Debit', 'مدين')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Credit', 'دائن')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
            </tr>
          </thead>
          <tbody>
            {tb.data?.rows.map((r) => (
              <tr key={r.account.code} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{r.account.code}</td>
                <td className="px-4 py-2">{r.account.name}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.totalDebit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.totalCredit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.balance).toFixed(2)}</td>
              </tr>
            ))}
            {tb.data && (
              <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
                <td className="px-4 py-2" colSpan={2}>{L('Totals', 'الإجمالي')}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(tb.data.totalDebit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(tb.data.totalCredit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end text-green-600">{L('Balanced', 'متوازن')}</td>
              </tr>
            )}
          </tbody>
        </table>
        {tb.isError && <p className="p-3 text-sm text-red-600">{L('Could not load trial balance', 'تعذر تحميل ميزان المراجعة')}</p>}
      </div>
    </div>
  );
}
