'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { Grn } from '@/lib/purchasing-types';

export default function GoodsReceiptsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['grns'],
    queryFn: async () => (await api.get<Paged<Grn>>('/purchasing/goods-receipts', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Goods Receipts', 'استلام البضائع')}</h1>
        <Link href="/dashboard/purchasing/goods-receipts/new" className={btnCls}>{L('New Receipt', 'استلام جديد')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((g) => (
              <tr key={g.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/purchasing/goods-receipts/${g.id}`}>{g.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{g.date}</td>
                <td className="px-4 py-3">{g.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
