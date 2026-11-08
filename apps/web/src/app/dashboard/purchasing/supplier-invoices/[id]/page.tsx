'use client';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Match, Si } from '@/lib/purchasing-types';

export default function SupplierInvoiceDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const base = `/purchasing/supplier-invoices/${params.id}`;
  const inv = useQuery({ queryKey: ['sinv', params.id], queryFn: async () => (await api.get<Si>(base)).data });
  const match = useQuery({ queryKey: ['sinv-match', params.id], queryFn: async () => (await api.get<Match>(`${base}/three-way-match`)).data });
  const d = inv.data;
  if (!d) return <p className="text-slate-400">{inv.isError ? errMsg(inv.error) : '…'}</p>;
  const m = match.data;
  const fmt = (v: string | null | undefined) => (v == null ? '—' : money(v).toFixed(2));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" dir="ltr">{d.number}</h1>
        <p className="text-sm text-slate-500">{d.date} · {d.status} · {d.matchingStatus}</p>
      </div>

      <div className={`${cardCls} p-4`}>
        <h2 className="mb-3 font-semibold">{L('Three-way match', 'المطابقة الثلاثية')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5" dir="ltr">
          <div><div className="text-slate-500">PO</div><div className="font-mono">{fmt(m?.poTotal)}</div></div>
          <div><div className="text-slate-500">GRN</div><div className="font-mono">{fmt(m?.grnTotal)}</div></div>
          <div><div className="text-slate-500">Invoice</div><div className="font-mono">{fmt(m?.invoiceTotal)}</div></div>
          <div><div className="text-slate-500">Variance</div><div className="font-mono">{fmt(m?.variance)}</div></div>
          <div><div className="text-slate-500">Status</div><div className={m?.status === 'matched' ? 'text-green-600' : 'text-amber-600'}>{m?.status ?? '…'}</div></div>
        </div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'الوصف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Price', 'السعر')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.qty).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
