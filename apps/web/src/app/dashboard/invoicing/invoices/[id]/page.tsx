'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { InvoiceRow } from '@/lib/invoicing-types';

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const router = useRouter();
  const qc = useQueryClient();
  const base = `/invoicing/invoices/${params.id}`;

  const inv = useQuery({
    queryKey: ['invoice', params.id],
    queryFn: async () => (await api.get<InvoiceRow>(base)).data,
  });

  const act = useMutation({
    mutationFn: async (action: 'post' | 'void' | 'convert' | 'credit-note' | 'delete') => {
      if (action === 'delete') return (await api.delete(base)).data;
      return (await api.post<InvoiceRow>(`${base}/${action}`, action === 'credit-note' ? {} : undefined)).data;
    },
    onSuccess: (data, action) => {
      if (action === 'delete') return router.replace('/dashboard/invoicing/invoices');
      if (action === 'convert' || action === 'credit-note') return router.push(`/dashboard/invoicing/invoices/${(data as InvoiceRow).id}`);
      void qc.invalidateQueries({ queryKey: ['invoice', params.id] });
    },
  });

  const downloadPdf = async () => {
    const r = await api.get(`${base}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.data?.number ?? 'invoice'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const d = inv.data;
  if (!d) return <p className="text-slate-400">{inv.isError ? errMsg(inv.error) : '…'}</p>;
  const draft = d.status === 'draft' || d.status === 'sent';
  const title = { invoice: L('Invoice', 'فاتورة'), quote: L('Quote', 'عرض سعر'), credit_note: L('Credit Note', 'إشعار دائن') }[d.type];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{title} {d.number}</h1>
          <p className="text-sm text-slate-500">{d.customer.name} · {d.date} · {d.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => void downloadPdf()}>{L('Download PDF', 'تحميل PDF')}</button>
          {draft && d.type !== 'credit_note' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('delete')}>{L('Delete', 'حذف')}</button>}
          {draft && d.type === 'invoice' && <button type="button" className={btnCls} onClick={() => act.mutate('post')}>{L('Post', 'ترحيل')}</button>}
          {draft && d.type === 'quote' && <button type="button" className={btnCls} onClick={() => act.mutate('convert')}>{L('Convert to Invoice', 'تحويل إلى فاتورة')}</button>}
          {d.status === 'posted' && d.type === 'invoice' && (
            <>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => act.mutate('credit-note')}>{L('Credit Note', 'إشعار دائن')}</button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('void')}>{L('Void', 'إلغاء')}</button>
            </>
          )}
        </div>
      </div>

      {act.isError && <p className="mb-4 text-sm text-red-600">{errMsg(act.error)}</p>}
      {d.notes && <p className="mb-4 text-sm">{d.notes}</p>}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'الوصف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Unit price', 'السعر')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Subtotal', 'المجموع')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('VAT', 'الضريبة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.quantity).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.lineSubtotal).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.vatAmount).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ms-auto w-full max-w-sm space-y-1 text-sm font-mono" dir="ltr">
        <div className="flex justify-between"><span>Subtotal</span><span>{money(d.subtotal).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>VAT</span><span>{money(d.vatAmount).toFixed(2)}</span></div>
        <div className="flex justify-between font-bold"><span>Total</span><span>{money(d.total).toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span>{money(d.paidAmount).toFixed(2)}</span></div>
        <div className="flex justify-between font-bold"><span>Balance due</span><span>{money(d.balanceDue).toFixed(2)}</span></div>
      </div>
    </div>
  );
}
