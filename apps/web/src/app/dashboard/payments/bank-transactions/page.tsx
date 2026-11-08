'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Row { id: string; number: string; date: string; type: string; amount: string; description: string | null; isReconciled: boolean }

export default function BankTransactionsPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['bank-txs'],
    queryFn: async () => (await api.get<Paged<Row>>('/payments/bank-transactions', { params: { limit: 100 } })).data,
  });
  const rec = useMutation({
    mutationFn: async (id: string) => (await api.post(`/payments/bank-transactions/${id}/reconcile`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bank-txs'] }),
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Bank Transactions', 'الحركات البنكية')}</h1>
        <Link href="/dashboard/payments/bank-transactions/new" className={btnCls}>{L('New Transaction', 'حركة جديدة')}</Link>
      </div>
      {rec.isError && <p className="mb-4 text-sm text-red-600">{errMsg(rec.error)}</p>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Type', 'النوع')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'البيان')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Amount', 'المبلغ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Reconciled', 'مطابق')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((t) => (
              <tr key={t.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3 font-mono" dir="ltr">{t.number}</td>
                <td className="px-4 py-3" dir="ltr">{t.date}</td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3">{t.description ?? '—'}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(t.amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {t.isReconciled ? '✓' : (
                    <button type="button" className="text-primary hover:underline" onClick={() => rec.mutate(t.id)}>{L('Mark', 'تأكيد')}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
