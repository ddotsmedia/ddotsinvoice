'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { accountCode: string; nameEn: string; nameAr: string; debit: string; credit: string }
interface Tb { rows: Row[]; totalDebits: string; totalCredits: string; balanced: boolean }

export default function TrialBalanceReportPage() {
  const L = useLabel();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({ queryKey: ['tb-report', asOf], queryFn: async () => (await api.get<Tb>('/reports/trial-balance', { params: { asOfDate: asOf } })).data });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Trial Balance', 'ميزان المراجعة')}</h1>
        <input type="date" dir="ltr" className={`${inputCls} w-48`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Account', 'الحساب')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Debit', 'مدين')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Credit', 'دائن')}</th>
            </tr>
          </thead>
          <tbody>
            {r.data?.rows.map((x) => (
              <tr key={x.accountCode} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{x.accountCode}</td>
                <td className="px-4 py-2">{L(x.nameEn, x.nameAr)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.debit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.credit).toFixed(2)}</td>
              </tr>
            ))}
            {r.data && (
              <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
                <td className="px-4 py-2" colSpan={2}>{L('Totals', 'الإجمالي')} {r.data.balanced ? '✓' : '✗'}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.data.totalDebits).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.data.totalCredits).toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
