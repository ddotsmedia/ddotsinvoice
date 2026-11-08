'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Row { id: string; statementDate: string; openingBalance: string; closingBalance: string; status: string }

export default function ReconciliationsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => (await api.get<Paged<Row>>('/payments/reconciliations', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Bank Reconciliations', 'التسويات البنكية')}</h1>
        <Link href="/dashboard/payments/reconciliations/new" className={btnCls}>{L('New Reconciliation', 'تسوية جديدة')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Statement date', 'تاريخ الكشف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Opening', 'الرصيد الافتتاحي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Closing', 'الرصيد الختامي')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((r) => (
              <tr key={r.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="text-primary hover:underline" dir="ltr" href={`/dashboard/payments/reconciliations/${r.id}`}>{r.statementDate}</Link></td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(r.openingBalance).toFixed(2)}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(r.closingBalance).toFixed(2)}</td>
                <td className="px-4 py-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
