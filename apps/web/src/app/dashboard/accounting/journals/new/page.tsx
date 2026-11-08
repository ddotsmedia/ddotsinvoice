'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, eq, isZero, money, sub, toDb, type Money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { AccountNode } from '@/lib/accounting-types';

interface Line { accountId: string; debit: string; credit: string; description: string }
const blank = (): Line => ({ accountId: '', debit: '', credit: '', description: '' });
// Non-numeric input counts as zero
const safe = (v: string): Money => { try { return money(v || '0'); } catch { return money(0); } };

const flatten = (nodes: AccountNode[]): AccountNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

export default function NewJournalPage() {
  const L = useLabel();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>([blank(), blank()]);

  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get<AccountNode[]>('/accounting/accounts')).data,
  });
  const postable = flatten(accounts.data ?? []).filter((a) => !a.isHeader && a.isActive);

  const dr = lines.reduce((acc, l) => add(acc, safe(l.debit)), money(0));
  const cr = lines.reduce((acc, l) => add(acc, safe(l.credit)), money(0));
  const diff = sub(dr, cr);
  const balanced = eq(dr, cr) && !isZero(dr);

  const update = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const body = {
        date,
        description,
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            debit: l.debit || undefined,
            credit: l.credit || undefined,
            description: l.description || undefined,
          })),
      };
      const { data } = await api.post<{ id: string }>('/accounting/journals', body);
      if (andPost) await api.post(`/accounting/journals/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/accounting/journals/${id}`),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Journal Entry', 'قيد يومية جديد')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L('Date', 'التاريخ')}>
            <input type="date" dir="ltr" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={L('Description', 'البيان')}>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Account', 'الحساب')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Debit', 'مدين')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Credit', 'دائن')}</th>
                <th className="px-2 py-2 text-start font-medium">{L('Line memo', 'ملاحظة')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <select className={inputCls} value={l.accountId} onChange={(e) => update(i, { accountId: e.target.value })}>
                      <option value="">—</option>
                      {postable.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input dir="ltr" inputMode="decimal" className={`${inputCls} text-end`} value={l.debit} onChange={(e) => update(i, { debit: e.target.value, credit: '' })} />
                  </td>
                  <td className="px-2 py-1">
                    <input dir="ltr" inputMode="decimal" className={`${inputCls} text-end`} value={l.credit} onChange={(e) => update(i, { credit: e.target.value, debit: '' })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className={inputCls} value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    {lines.length > 2 && (
                      <button type="button" className="text-red-600" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, blank()])}>
            + {L('Add line', 'إضافة سطر')}
          </button>
          <div className="flex items-center gap-4 font-mono text-sm" dir="ltr">
            <span>Dr {toDb(dr).slice(0, 12)}</span>
            <span>Cr {toDb(cr).slice(0, 12)}</span>
            <span className={balanced ? 'text-green-600' : 'text-red-600'}>
              {balanced ? L('Balanced', 'متوازن') : `${L('Difference', 'الفرق')} ${diff.toFixed(2)}`}
            </span>
          </div>
        </div>

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={save.isPending} onClick={() => save.mutate(false)}>
            {L('Save Draft', 'حفظ كمسودة')}
          </button>
          <button type="button" className={btnCls} disabled={!balanced || save.isPending} onClick={() => save.mutate(true)}>
            {L('Post', 'ترحيل')}
          </button>
        </div>
      </div>
    </div>
  );
}
