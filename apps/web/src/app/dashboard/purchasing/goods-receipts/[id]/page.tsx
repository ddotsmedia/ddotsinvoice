'use client';

import { use } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Grn } from '@/lib/purchasing-types';

export default function GrnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/purchasing/goods-receipts/${rid}`;
  const grn = useQuery({ queryKey: ['grn', rid], queryFn: async () => (await api.get<Grn>(base)).data });
  const post = useMutation({
    mutationFn: async () => (await api.post(`${base}/post`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['grn', rid] }),
  });
  const d = grn.data;
  if (!d) return <p className="text-slate-400">{grn.isError ? errMsg(grn.error) : '…'}</p>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{d.number}</h1>
          <p className="text-sm text-slate-500">{d.date} · {d.status}{d.journalEntryId ? ' · JE' : ''}</p>
        </div>
        {d.status === 'draft' && <button type="button" className={btnCls} onClick={() => post.mutate()}>{L('Post', 'ترحيل')}</button>}
      </div>
      {post.isError && <p className="mb-4 text-sm text-red-600">{errMsg(post.error)}</p>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'الوصف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Unit cost', 'تكلفة الوحدة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.qtyReceived).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.unitCost).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
