'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Run { id: string; periodYear: number; periodMonth: number; status: string; totalGross: string; totalNet: string }

export default function PayrollPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['payroll'],
    queryFn: async () => (await api.get<Paged<Run>>('/hr/payroll', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Payroll Runs', 'مسيرات الرواتب')}</h1>
        <Link href="/dashboard/hr/payroll/new" className={btnCls}>{L('Generate Run', 'إنشاء مسير')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Period', 'الفترة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Gross', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Net', 'الصافي')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((r) => (
              <tr key={r.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="text-primary hover:underline" dir="ltr" href={`/dashboard/hr/payroll/${r.id}`}>{r.periodYear}-{String(r.periodMonth).padStart(2, '0')}</Link></td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(r.totalGross).toFixed(2)}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(r.totalNet).toFixed(2)}</td>
                <td className="px-4 py-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
