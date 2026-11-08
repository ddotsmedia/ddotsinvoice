'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Summary { openingBalance: string; closingBalance: string; bookBalance: string; reconciledCount: number; unreconciledCount: number; difference: string }
interface Rec { id: string; statementDate: string; status: string }
interface Tx { id: string; number: string; date: string; type: string; amount: string; isReconciled: boolean }

export default function ReconciliationWorkspacePage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/payments/reconciliations/${params.id}`;
  const rec = useQuery({ queryKey: ['rec', params.id], queryFn: async () => (await api.get<Rec>(base)).data });
  const sum = useQuery({ queryKey: ['rec-sum', params.id], queryFn: async () => (await api.get<Summary>(`${base}/summary`)).data });
  const txs = useQuery({
    queryKey: ['rec-txs', params.id],
    enabled: !!rec.data,
    queryFn: async () => (await api.get<{ items: Tx[] }>('/payments/bank-transactions', { params: { limit: 100, bankAccountId: (rec.data as unknown as { bankAccountId: string }).bankAccountId } })).data.items,
  });
  const reconcile = useMutation({
    mutationFn: async (id: string) => (await api.post(`/payments/bank-transactions/${id}/reconcile`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rec-sum', params.id] });
      void qc.invalidateQueries({ queryKey: ['rec-txs', params.id] });
    },
  });
  const close = useMutation({
    mutationFn: async () => (await api.post(`${base}/close`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['rec', params.id] }),
  });

  const s = sum.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{rec.data?.statementDate ?? '…'}</h1>
          <p className="text-sm text-slate-500">{rec.data?.status}</p>
        </div>
        {rec.data?.status === 'open' && <button type="button" className={btnCls} onClick={() => close.mutate()}>{L('Close reconciliation', 'إقفال التسوية')}</button>}
      </div>
      {(close.isError || reconcile.isError) && <p className="text-sm text-red-600">{errMsg(close.error ?? reconcile.error)}</p>}

      <div className={`${cardCls} grid grid-cols-2 gap-3 p-4 text-sm md:grid-cols-6`} dir="ltr">
        <div><div className="text-slate-500">Opening</div><div className="font-mono">{money(s?.openingBalance ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Book</div><div className="font-mono">{money(s?.bookBalance ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Statement</div><div className="font-mono">{money(s?.closingBalance ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Difference</div><div className={`font-mono ${s && money(s.difference).isZero() ? 'text-green-600' : 'text-amber-600'}`}>{money(s?.difference ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Reconciled</div><div>{s?.reconciledCount ?? 0}</div></div>
        <div><div className="text-slate-500">Open</div><div>{s?.unreconciledCount ?? 0}</div></div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Type', 'النوع')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Amount', 'المبلغ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Reconciled', 'مطابق')}</th>
            </tr>
          </thead>
          <tbody>
            {txs.data?.map((t) => (
              <tr key={t.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{t.number}</td>
                <td className="px-4 py-2" dir="ltr">{t.date}</td>
                <td className="px-4 py-2">{t.type}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(t.amount).toFixed(2)}</td>
                <td className="px-4 py-2">
                  {t.isReconciled ? '✓' : <button type="button" className="text-primary hover:underline" onClick={() => reconcile.mutate(t.id)}>{L('Mark', 'تأكيد')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
