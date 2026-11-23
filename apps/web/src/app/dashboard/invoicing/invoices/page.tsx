'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { InvoiceRow } from '@/lib/invoicing-types';

const TABS = ['invoice', 'quote', 'credit_note'] as const;

function InvoicesInner() {
  const L = useLabel();
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const type = (TABS as readonly string[]).includes(sp.get('type') ?? '') ? (sp.get('type') as (typeof TABS)[number]) : 'invoice';
  const tabLabel: Record<string, string> = {
    invoice: L('Invoices', 'الفواتير'),
    quote: L('Quotes', 'عروض الأسعار'),
    credit_note: L('Credit Notes', 'إشعارات الدائن'),
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const list = useQuery({
    queryKey: ['invoices', type],
    queryFn: async () => (await api.get<Paged<InvoiceRow>>('/invoicing/invoices', { params: { type, limit: 100 } })).data,
  });

  const items = list.data?.items ?? [];
  const allIds = items.map((i) => i.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };

  const bulkMut = useMutation({
    mutationFn: async (action: 'mark_sent' | 'delete') => {
      const ids = [...selected];
      if (action === 'delete') return (await api.delete('/invoicing/invoices/bulk', { data: { ids } })).data;
      return (await api.patch('/invoicing/invoices/bulk', { ids, action: 'mark_sent' })).data;
    },
    onSuccess: (_, action) => {
      setSelected(new Set());
      void qc.invalidateQueries({ queryKey: ['invoices', type] });
      toast.success(action === 'delete' ? 'Deleted' : 'Marked as sent');
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const downloadSelected = async () => {
    for (const id of selected) {
      const inv = items.find((i) => i.id === id);
      const r = await api.get(`/invoicing/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv?.number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Sales Documents', 'مستندات المبيعات')}</h1>
        <Link href={`/dashboard/invoicing/invoices/new?type=${type === 'quote' ? 'quote' : 'invoice'}`} className={btnCls}>
          {type === 'quote' ? L('New Quote', 'عرض سعر جديد') : L('New Invoice', 'فاتورة جديدة')}
        </Link>
      </div>

      <div className="mb-4 flex gap-2 border-b border-border dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { router.push(`/dashboard/invoicing/invoices?type=${t}`); setSelected(new Set()); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${type === t ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm dark:bg-slate-800">
          <span className="text-slate-500">{selected.size} {L('selected', 'محدد')}</span>
          <button type="button" className="rounded-md border border-border bg-white px-3 py-1 text-sm dark:bg-slate-700" onClick={() => bulkMut.mutate('mark_sent')} disabled={bulkMut.isPending}>{L('Mark as Sent', 'وضع علامة مرسل')}</button>
          <button type="button" className="rounded-md border border-border bg-white px-3 py-1 text-sm dark:bg-slate-700" onClick={() => void downloadSelected()}>{L('Download PDFs', 'تحميل PDF')}</button>
          <button type="button" className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm text-red-600 dark:bg-slate-700" onClick={() => bulkMut.mutate('delete')} disabled={bulkMut.isPending}>{L('Delete', 'حذف')}</button>
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
              </th>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Customer', 'العميل')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="cursor-pointer" />
                </td>
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/invoicing/invoices/${i.id}`}>{i.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{i.date}</td>
                <td className="px-4 py-3">{i.customer.name}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(i.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(i.balanceDue).toFixed(2)}</td>
                <td className="px-4 py-3">{i.status}</td>
              </tr>
            ))}
            {!list.isLoading && !items.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{L('No documents', 'لا توجد مستندات')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesInner />
    </Suspense>
  );
}
