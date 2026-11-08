'use client';

import { use } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Alloc { id: string; invoiceNumber: string; allocatedAmount: string }
interface Payment { id: string; number: string; date: string; amount: string; paymentMethod: string; status: string; allocations: Alloc[] }

export default function SupplierPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/payments/supplier-payments/${rid}`;
  const p = useQuery({ queryKey: ['sp', rid], queryFn: async () => (await api.get<Payment>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'post' | 'void') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sp', rid] }); toast.success('Saved'); },
  });
  const d = p.data;
  if (!d) return <p className="text-slate-400">{p.isError ? errMsg(p.error) : '…'}</p>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{d.number}</h1>
          <p className="text-sm text-slate-500">{d.date} · {d.paymentMethod} · {d.status}</p>
        </div>
        <div className="flex gap-2">
          {d.status === 'draft' && <button type="button" className={btnCls} onClick={() => act.mutate('post')}>{L('Post', 'ترحيل')}</button>}
          {d.status === 'posted' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('void')}>{L('Void', 'إلغاء')}</button>}
        </div>
      </div>
      {act.isError && <p className="mb-4 text-sm text-red-600">{errMsg(act.error)}</p>}
      <p className="mb-4 font-mono" dir="ltr">{money(d.amount).toFixed(2)}</p>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Invoice', 'الفاتورة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Allocated', 'المخصص')}</th>
            </tr>
          </thead>
          <tbody>
            {d.allocations.map((a) => (
              <tr key={a.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{a.invoiceNumber}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(a.allocatedAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
