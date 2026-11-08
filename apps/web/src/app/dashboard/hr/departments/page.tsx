'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Dept { id: string; code: string; nameEn: string; nameAr: string; isActive: boolean }

export default function DepartmentsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get<Paged<Dept>>('/hr/departments', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Departments', 'الأقسام')}</h1>
        <Link href="/dashboard/hr/departments/new" className={btnCls}>{L('New Department', 'قسم جديد')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((d) => (
              <tr key={d.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3 font-mono" dir="ltr">{d.code}</td>
                <td className="px-4 py-3">{L(d.nameEn, d.nameAr)}</td>
                <td className="px-4 py-3">{d.isActive ? L('Active', 'نشط') : L('Inactive', 'غير نشط')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
