'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Emp { id: string; employeeNumber: string; nameEn: string; nameAr: string; jobTitle: string; status: string; hireDate: string }

export default function EmployeesPage() {
  const L = useLabel();
  const [search, setSearch] = useState('');
  const list = useQuery({
    queryKey: ['employees', search],
    queryFn: async () => (await api.get<Paged<Emp>>('/hr/employees', { params: { limit: 100, ...(search && { search }) } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Employees', 'الموظفون')}</h1>
        <div className="flex gap-2">
          <input className={`${inputCls} w-56`} placeholder={L('Search', 'بحث')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Link href="/dashboard/hr/employees/new" className={btnCls}>{L('New Employee', 'موظف جديد')}</Link>
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Job title', 'المسمى')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((e) => (
              <tr key={e.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="font-mono text-primary hover:underline" dir="ltr" href={`/dashboard/hr/employees/${e.id}`}>{e.employeeNumber}</Link></td>
                <td className="px-4 py-3">{L(e.nameEn, e.nameAr)}</td>
                <td className="px-4 py-3">{e.jobTitle}</td>
                <td className="px-4 py-3">{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
