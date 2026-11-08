'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { Supplier } from '@/lib/purchasing-types';

export default function SuppliersPage() {
  const L = useLabel();
  const [search, setSearch] = useState('');
  const list = useQuery({
    queryKey: ['suppliers', search],
    queryFn: async () => (await api.get<Paged<Supplier>>('/purchasing/suppliers', { params: { limit: 100, ...(search && { search }) } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Suppliers', 'الموردون')}</h1>
        <div className="flex gap-2">
          <input className={`${inputCls} w-56`} placeholder={L('Search', 'بحث')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Link href="/dashboard/purchasing/suppliers/new" className={btnCls}>{L('New Supplier', 'مورد جديد')}</Link>
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('TRN', 'الرقم الضريبي')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Terms', 'الشروط')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((s) => (
              <tr key={s.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3 font-mono" dir="ltr">{s.code}</td>
                <td className="px-4 py-3">{L(s.nameEn, s.nameAr)}</td>
                <td className="px-4 py-3 font-mono" dir="ltr">{s.trn ?? '—'}</td>
                <td className="px-4 py-3" dir="ltr">Net {s.paymentTerms}</td>
              </tr>
            ))}
            {!list.isLoading && !list.data?.items.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{L('No suppliers', 'لا يوجد موردون')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
