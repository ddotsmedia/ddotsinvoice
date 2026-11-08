'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Row { id: string; number: string; date: string; amount: string; paymentMethod: string; status: string }

export default function CustomerPaymentsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['customer-payments'],
    queryFn: async () => (await api.get<Paged<Row>>('/payments/customer-payments', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Customer Receipts', 'إيصالات العملاء')}</h1>
        <Link href="/dashboard/payments/customer-payments/new" className={btnCls}>{L('New Receipt', 'إيصال جديد')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Method', 'الطريقة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Amount', 'المبلغ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((p) => (
              <tr key={p.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/payments/customer-payments/${p.id}`}>{p.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{p.date}</td>
                <td className="px-4 py-3">{p.paymentMethod}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
