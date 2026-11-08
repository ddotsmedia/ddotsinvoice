'use client';

import { use } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Po } from '@/lib/purchasing-types';

export default function PoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/purchasing/purchase-orders/${rid}`;
  const po = useQuery({ queryKey: ['po', rid], queryFn: async () => (await api.get<Po>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'submit' | 'approve' | 'cancel') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['po', rid] }),
  });
  const d = po.data;
  if (!d) return <p className="text-slate-400">{po.isError ? errMsg(po.error) : '…'}</p>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{d.number}</h1>
          <p className="text-sm text-slate-500">{d.date} · {d.status}</p>
        </div>
        <div className="flex gap-2">
          {d.status === 'draft' && <button type="button" className={btnCls} onClick={() => act.mutate('submit')}>{L('Submit', 'إرسال')}</button>}
          {d.status === 'submitted' && <button type="button" className={btnCls} onClick={() => act.mutate('approve')}>{L('Approve', 'اعتماد')}</button>}
          {(d.status === 'draft' || d.status === 'submitted') && (
            <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('cancel')}>{L('Cancel', 'إلغاء')}</button>
          )}
        </div>
      </div>
      {act.isError && <p className="mb-4 text-sm text-red-600">{errMsg(act.error)}</p>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'الوصف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Price', 'السعر')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('VAT', 'الضريبة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.qty).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.vatAmount).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 ms-auto max-w-sm space-y-1 font-mono text-sm" dir="ltr">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(d.subtotal ?? '0').toFixed(2)}</span></div>
        <div className="flex justify-between"><span>VAT</span><span>{money(d.vatAmount ?? '0').toFixed(2)}</span></div>
        <div className="flex justify-between font-bold"><span>Total</span><span>{money(d.total ?? '0').toFixed(2)}</span></div>
      </div>
    </div>
  );
}
