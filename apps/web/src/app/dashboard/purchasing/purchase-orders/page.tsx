'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { Po } from '@/lib/purchasing-types';

export default function PurchaseOrdersPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['pos'],
    queryFn: async () => (await api.get<Paged<Po>>('/purchasing/purchase-orders', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Purchase Orders', 'أوامر الشراء')}</h1>
        <Link href="/dashboard/purchasing/purchase-orders/new" className={btnCls}>{L('New PO', 'أمر شراء جديد')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((p) => (
              <tr key={p.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/purchasing/purchase-orders/${p.id}`}>{p.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{p.date}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(p.total ?? '0').toFixed(2)}</td>
                <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
