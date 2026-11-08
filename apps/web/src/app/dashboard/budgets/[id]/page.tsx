'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Line { id: string; code: string; nameEn: string; budgetedAmount: string; actualAmount: string; variance: string }
interface Budget { id: string; name: string; fiscalYear: number; fiscalMonth: number | null; status: string; lines: Line[] }

export default function BudgetDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/budgets/${params.id}`;
  const b = useQuery({ queryKey: ['budget', params.id], queryFn: async () => (await api.get<Budget>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'approve' | 'refresh-actuals') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['budget', params.id] }),
  });
  const d = b.data;
  if (!d) return <p className="text-slate-400">{b.isError ? errMsg(b.error) : '…'}</p>;
  const chart = d.lines.map((l) => ({ name: l.code, budget: Number(l.budgetedAmount), actual: Number(l.actualAmount) }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{d.name}</h1>
          <p className="text-sm text-slate-500" dir="ltr">{d.fiscalYear}{d.fiscalMonth ? `-${String(d.fiscalMonth).padStart(2, '0')}` : ''} · {d.status}</p>
        </div>
        <div className="flex gap-2">
          {d.status === 'draft' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => act.mutate('approve')}>{L('Approve', 'اعتماد')}</button>}
          <button type="button" className={btnCls} onClick={() => act.mutate('refresh-actuals')}>{L('Refresh actuals', 'تحديث الفعلي')}</button>
        </div>
      </div>
      {act.isError && <p className="text-sm text-red-600">{errMsg(act.error)}</p>}

      <div className={`${cardCls} h-72 p-4`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="budget" fill="#94a3b8" />
            <Bar dataKey="actual" fill="#1B4FD8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Account', 'الحساب')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Budget', 'المخطط')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Actual', 'الفعلي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Variance', 'الانحراف')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2" dir="ltr">{l.code} {l.nameEn}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.budgetedAmount).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.actualAmount).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.variance).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
