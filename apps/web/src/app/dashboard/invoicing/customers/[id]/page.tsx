'use client';

import { use } from 'react';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Customer, Statement } from '@/lib/invoicing-types';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const customer = useQuery({
    queryKey: ['customer', rid],
    queryFn: async () => (await api.get<Customer>(`/invoicing/customers/${rid}`)).data,
  });
  const statement = useQuery({
    queryKey: ['statement', rid],
    queryFn: async () => (await api.get<Statement>(`/invoicing/customers/${rid}/statement`)).data,
  });

  if (customer.isError) return <p className="text-red-600">{errMsg(customer.error)}</p>;
  const c = customer.data;
  const s = statement.data;
  const buckets: [keyof Statement['aging'], string][] = [
    ['current', L('Current', 'حالي')],
    ['days30', '1–30'],
    ['days60', '31–60'],
    ['days90', '61–90'],
    ['over90', '90+'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{c?.name ?? '…'}</h1>
        {c && <p className="text-sm text-slate-500" dir="ltr">TRN {c.trn ?? '—'} · Net {c.paymentTerms} · {c.currency}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={`${cardCls} p-4`}><div className="text-sm text-slate-500">{L('Outstanding', 'المستحق')}</div><div className="mt-1 text-xl font-bold" dir="ltr">{money(s?.totalOutstanding ?? '0').toFixed(2)}</div></div>
        <div className={`${cardCls} p-4`}><div className="text-sm text-slate-500">{L('Open invoices', 'فواتير مفتوحة')}</div><div className="mt-1 text-xl font-bold">{c?.balance !== undefined ? s?.invoices.length ?? 0 : 0}</div></div>
      </div>

      <div className={`${cardCls} p-4`}>
        <h2 className="mb-3 font-semibold">{L('Aging', 'أعمار الديون')}</h2>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {buckets.map(([k, label]) => (
            <div key={k} className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-slate-500">{label}</div>
              <div className="mt-1 font-mono" dir="ltr">{money(s?.aging[k] ?? '0').toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Due', 'الاستحقاق')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {s?.invoices.map((i) => (
              <tr key={i.number} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{i.number}</td>
                <td className="px-4 py-2" dir="ltr">{i.date}</td>
                <td className="px-4 py-2" dir="ltr">{i.dueDate ?? '—'}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(i.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(i.balanceDue).toFixed(2)}</td>
                <td className="px-4 py-2">{i.status}</td>
              </tr>
            ))}
            {s && !s.invoices.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{L('No open invoices', 'لا توجد فواتير مفتوحة')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
