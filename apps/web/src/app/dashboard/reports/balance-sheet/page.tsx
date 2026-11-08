'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { accountCode: string; nameEn: string; nameAr: string; balance: string }
interface Bs { assets: Row[]; liabilities: Row[]; equity: Row[]; totalAssets: string; totalLiabilities: string; totalEquity: string; currentPeriodEarnings: string; balanced: boolean }

export default function BalanceSheetPage() {
  const L = useLabel();
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({ queryKey: ['bs', asOf], queryFn: async () => (await api.get<Bs>('/reports/balance-sheet', { params: { asOfDate: asOf } })).data });
  const section = (title: string, rows: Row[], total: string) => (
    <div>
      <h2 className="mb-2 font-semibold">{title}</h2>
      {rows.map((x) => (
        <div key={x.accountCode} className="flex justify-between py-1 text-sm">
          <span>{x.accountCode} {L(x.nameEn, x.nameAr)}</span>
          <span className="font-mono" dir="ltr">{money(x.balance).toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold" dir="ltr">
        <span>{L('Total', 'الإجمالي')}</span><span className="font-mono">{money(total).toFixed(2)}</span>
      </div>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Balance Sheet', 'الميزانية العمومية')}</h1>
        <input type="date" dir="ltr" className={`${inputCls} w-48`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </div>
      {r.data && (
        <p className={r.data.balanced ? 'text-green-600' : 'text-red-600'}>
          {r.data.balanced ? L('Balanced', 'متوازنة') : L('Out of balance', 'غير متوازنة')}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${cardCls} p-6`}>{r.data && section(L('Assets', 'الأصول'), r.data.assets, r.data.totalAssets)}</div>
        <div className={`${cardCls} space-y-6 p-6`}>
          {r.data && section(L('Liabilities', 'الخصوم'), r.data.liabilities, r.data.totalLiabilities)}
          {r.data && section(L('Equity', 'حقوق الملكية'), r.data.equity, r.data.totalEquity)}
        </div>
      </div>
    </div>
  );
}
