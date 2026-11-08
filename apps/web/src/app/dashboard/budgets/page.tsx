'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Budget { id: string; name: string; fiscalYear: number; fiscalMonth: number | null; status: string }

export default function BudgetsPage() {
  const L = useLabel();
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const list = useQuery({ queryKey: ['budgets', year], queryFn: async () => (await api.get<Budget[]>('/budgets', { params: { year } })).data });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Budgets', 'الموازنات')}</h1>
        <div className="flex gap-2">
          <input type="number" dir="ltr" className={`${inputCls} w-32`} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <Link href="/dashboard/budgets/new" className={btnCls}>{L('New Budget', 'موازنة جديدة')}</Link>
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Period', 'الفترة')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((b) => (
              <tr key={b.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/dashboard/budgets/${b.id}`}>{b.name}</Link></td>
                <td className="px-4 py-3" dir="ltr">{b.fiscalMonth ? `${b.fiscalYear}-${String(b.fiscalMonth).padStart(2, '0')}` : b.fiscalYear}</td>
                <td className="px-4 py-3">{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
