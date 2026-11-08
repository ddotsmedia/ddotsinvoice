'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { InvoiceRow } from '@/lib/invoicing-types';

const TABS = ['invoice', 'quote', 'credit_note'] as const;

function InvoicesInner() {
  const L = useLabel();
  const router = useRouter();
  const sp = useSearchParams();
  const type = (TABS as readonly string[]).includes(sp.get('type') ?? '') ? (sp.get('type') as (typeof TABS)[number]) : 'invoice';
  const tabLabel: Record<string, string> = {
    invoice: L('Invoices', 'الفواتير'),
    quote: L('Quotes', 'عروض الأسعار'),
    credit_note: L('Credit Notes', 'إشعارات الدائن'),
  };

  const list = useQuery({
    queryKey: ['invoices', type],
    queryFn: async () => (await api.get<Paged<InvoiceRow>>('/invoicing/invoices', { params: { type, limit: 100 } })).data,
  });

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
            onClick={() => router.push(`/dashboard/invoicing/invoices?type=${t}`)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${type === t ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Customer', 'العميل')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((i) => (
              <tr key={i.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/invoicing/invoices/${i.id}`}>{i.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{i.date}</td>
                <td className="px-4 py-3">{i.customer.name}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(i.total).toFixed(2)}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(i.balanceDue).toFixed(2)}</td>
                <td className="px-4 py-3">{i.status}</td>
              </tr>
            ))}
            {!list.isLoading && !list.data?.items.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{L('No documents', 'لا توجد مستندات')}</td></tr>
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
