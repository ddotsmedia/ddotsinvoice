'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Journal } from '@/lib/accounting-types';

export default function JournalDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const router = useRouter();
  const qc = useQueryClient();
  const base = `/accounting/journals/${params.id}`;

  const journal = useQuery({
    queryKey: ['journal', params.id],
    queryFn: async () => (await api.get<Journal>(base)).data,
  });

  const act = useMutation({
    mutationFn: async (action: 'post' | 'reverse' | 'delete') => {
      if (action === 'delete') return (await api.delete(base)).data;
      return (await api.post<Journal>(`${base}/${action}`)).data;
    },
    onSuccess: (data, action) => {
      if (action === 'delete') return router.replace('/dashboard/accounting/journals');
      if (action === 'reverse') return router.push(`/dashboard/accounting/journals/${(data as Journal).id}`);
      void qc.invalidateQueries({ queryKey: ['journal', params.id] });
    },
  });

  const j = journal.data;
  if (!j) return <p className="text-slate-400">{journal.isError ? errMsg(journal.error) : '…'}</p>;

  const debit = j.lines.reduce((acc, l) => acc.plus(money(l.debit)), money(0));
  const credit = j.lines.reduce((acc, l) => acc.plus(money(l.credit)), money(0));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{j.number}</h1>
          <p className="text-sm text-slate-500">{j.date} · {j.status}</p>
        </div>
        <div className="flex gap-2">
          {j.status === 'draft' && (
            <>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('delete')}>{L('Delete', 'حذف')}</button>
              <button type="button" className={btnCls} onClick={() => act.mutate('post')}>{L('Post', 'ترحيل')}</button>
            </>
          )}
          {j.status === 'posted' && (
            <button type="button" className={btnCls} onClick={() => act.mutate('reverse')}>{L('Reverse', 'عكس القيد')}</button>
          )}
        </div>
      </div>

      {act.isError && <p className="mb-4 text-sm text-red-600">{errMsg(act.error)}</p>}
      <p className="mb-4">{j.description}</p>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Account', 'الحساب')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Debit', 'مدين')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Credit', 'دائن')}</th>
            </tr>
          </thead>
          <tbody>
            {j.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2" dir="ltr">{l.code} {l.accountName}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.debit).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.credit).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
              <td className="px-4 py-2">{L('Total', 'الإجمالي')}</td>
              <td className="px-4 py-2 text-end font-mono" dir="ltr">{debit.toFixed(2)}</td>
              <td className="px-4 py-2 text-end font-mono" dir="ltr">{credit.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
