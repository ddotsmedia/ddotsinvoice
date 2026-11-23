'use client';

import { use, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { InvoiceRow } from '@/lib/invoicing-types';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const router = useRouter();
  const qc = useQueryClient();
  const base = `/invoicing/invoices/${rid}`;
  const [emailModal, setEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  const inv = useQuery({
    queryKey: ['invoice', rid],
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
      void qc.invalidateQueries({ queryKey: ['invoice', rid] });
      toast.success(action === 'post' ? 'Invoice posted' : 'Invoice updated');
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

  const portalLinkMut = useMutation({
    mutationFn: async () => (await api.post<{ url: string }>(`${base}/portal-link`)).data,
    onSuccess: (data) => setPortalUrl(data.url),
    onError: (e) => toast.error(errMsg(e)),
  });

  const sendWhatsApp = async () => {
    if (!d) return;
    const customer = d as InvoiceRow & { customer: { name: string; phone?: string } };
    const phone = customer.customer?.phone;
    if (!phone) { setWhatsappToast('No phone number on file for this customer'); setTimeout(() => setWhatsappToast(null), 4000); return; }
    let url: string;
    try {
      const res = await api.post<{ url: string }>(`${base}/portal-link`);
      url = res.data.url;
    } catch { url = window.location.href; }
    const msg = `Dear ${customer.customer.name}, please find your invoice #${d.number} for AED ${d.total} due ${d.dueDate ?? 'on receipt'}. View & download: ${url}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendEmailMut = useMutation({
    mutationFn: async (to: string) => (await api.post(`${base}/send-email`, { to: to || undefined })).data,
    onSuccess: () => { setEmailModal(false); toast.success('Email sent'); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const d = inv.data;
  if (!d) return <p className="text-slate-400">{inv.isError ? errMsg(inv.error) : '…'}</p>;
  const draft = d.status === 'draft' || d.status === 'sent';
  const title = { invoice: L('Invoice', 'فاتورة'), quote: L('Quote', 'عرض سعر'), credit_note: L('Credit Note', 'إشعار دائن') }[d.type];
  const ackd = (d as InvoiceRow & { portalPaidAcknowledgedAt?: string }).portalPaidAcknowledgedAt;

  return (
    <div>
      {portalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">{L('Portal Link', 'رابط البوابة')}</h2>
            <p className="mb-2 text-xs text-slate-500">{L('Share this link with your customer. Valid 30 days.', 'شارك هذا الرابط مع عميلك. صالح 30 يوماً.')}</p>
            <input readOnly className="mb-4 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" value={portalUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
            <div className="flex gap-2 justify-end">
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => { void navigator.clipboard.writeText(portalUrl); toast.success(L('Copied!', 'تم النسخ!')); }}>{L('Copy', 'نسخ')}</button>
              <button type="button" className={btnCls} onClick={() => setPortalUrl(null)}>{L('Close', 'إغلاق')}</button>
            </div>
          </div>
        </div>
      )}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">{L('Send Invoice', 'إرسال الفاتورة')}</h2>
            <input
              type="email"
              className="mb-4 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              placeholder={L('Recipient email', 'بريد المستلم')}
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => setEmailModal(false)}>{L('Cancel', 'إلغاء')}</button>
              <button type="button" className={btnCls} disabled={sendEmailMut.isPending} onClick={() => sendEmailMut.mutate(emailTo)}>
                {sendEmailMut.isPending ? '…' : L('Send', 'إرسال')}
              </button>
            </div>
          </div>
        </div>
      )}
      {whatsappToast && (
        <div className="fixed bottom-6 end-6 z-50 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 text-sm text-amber-800 shadow-lg">
          {whatsappToast}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{title} {d.number}</h1>
          <p className="text-sm text-slate-500">{d.customer.name} · {d.date} · {d.status}</p>
          {ackd && <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">⚠ Customer acknowledged payment</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => void downloadPdf()}>{L('Download PDF', 'تحميل PDF')}</button>
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => { setEmailTo((d as InvoiceRow & { customer: { email?: string } }).customer?.email ?? ''); setEmailModal(true); }}>{L('Send Email', 'إرسال بريد')}</button>
          {d.type === 'invoice' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={portalLinkMut.isPending} onClick={() => portalLinkMut.mutate()}>{L('Share Portal Link', 'مشاركة رابط البوابة')}</button>}
          {d.type === 'invoice' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-green-700" onClick={() => void sendWhatsApp()}>{L('Send via WhatsApp', 'إرسال واتساب')}</button>}
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
