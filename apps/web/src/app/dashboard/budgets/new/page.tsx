'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { AccountNode } from '@/lib/accounting-types';

interface Line { accountId: string; budgetedAmount: string }
const flat = (n: AccountNode[]): AccountNode[] => n.flatMap((x) => [x, ...flat(x.children)]);

export default function NewBudgetPage() {
  const L = useLabel();
  const router = useRouter();
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [month, setMonth] = useState<number | ''>('');
  const [lines, setLines] = useState<Line[]>([{ accountId: '', budgetedAmount: '' }]);
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get<AccountNode[]>('/accounting/accounts')).data });
  const postable = flat(accounts.data ?? []).filter((a) => !a.isHeader && a.isActive);
  const save = useMutation({
    mutationFn: async () =>
      (await api.post<{ id: string }>('/budgets', {
        name, fiscalYear: year, fiscalMonth: month === '' ? undefined : month,
        lines: lines.filter((l) => l.accountId && l.budgetedAmount).map((l) => ({ accountId: l.accountId, budgetedAmount: l.budgetedAmount })),
      })).data,
    onSuccess: (d) => router.push(`/dashboard/budgets/${d.id}`),
  });
  const valid = !!name && lines.some((l) => l.accountId && l.budgetedAmount);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{L('New Budget', 'موازنة جديدة')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L('Name', 'الاسم')}><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={L('Year', 'السنة')}><input type="number" dir="ltr" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
          <Field label={L('Month (blank = annual)', 'الشهر (فارغ = سنوية)')}>
            <input type="number" min={1} max={12} dir="ltr" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))} />
          </Field>
        </div>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-2 py-2 text-start font-medium">{L('Account', 'الحساب')}</th>
              <th className="px-2 py-2 text-end font-medium">{L('Budgeted', 'المخطط')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="px-2 py-1">
                  <select className={inputCls} value={l.accountId} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, accountId: e.target.value } : x)))}>
                    <option value="">—</option>
                    {postable.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 w-40">
                  <input dir="ltr" className={`${inputCls} text-end`} value={l.budgetedAmount} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, budgetedAmount: e.target.value } : x)))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, { accountId: '', budgetedAmount: '' }])}>+ {L('Add line', 'إضافة سطر')}</button>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate()}>{L('Save', 'حفظ')}</button></div>
      </div>
    </div>
  );
}
