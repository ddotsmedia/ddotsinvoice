'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged, JournalRow } from '@/lib/accounting-types';

export default function JournalsPage() {
  const L = useLabel();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const list = useQuery({
    queryKey: ['journals', status, page],
    queryFn: async () =>
      (await api.get<Paged<JournalRow>>('/accounting/journals', { params: { page, limit, ...(status && { status }) } })).data,
  });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / limit));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{L('Journal Entries', 'قيود اليومية')}</h1>
        <Link href="/dashboard/accounting/journals/new" className={btnCls}>{L('New Entry', 'قيد جديد')}</Link>
      </div>

      <div className="mb-4 w-48">
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{L('All statuses', 'كل الحالات')}</option>
          <option value="draft">{L('Draft', 'مسودة')}</option>
          <option value="posted">{L('Posted', 'مرحّل')}</option>
          <option value="reversed">{L('Reversed', 'معكوس')}</option>
        </select>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Number', 'الرقم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Date', 'التاريخ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Description', 'البيان')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Debit', 'مدين')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((j) => (
              <tr key={j.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/dashboard/accounting/journals/${j.id}`} dir="ltr">{j.number}</Link></td>
                <td className="px-4 py-3" dir="ltr">{j.date}</td>
                <td className="px-4 py-3">{j.description}</td>
                <td className="px-4 py-3">{j.status}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(j.totalDebit).toFixed(2)}</td>
              </tr>
            ))}
            {!list.isLoading && !list.data?.items.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{L('No entries', 'لا توجد قيود')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">{L('Prev', 'السابق')}</button>
        <span>{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">{L('Next', 'التالي')}</button>
      </div>
    </div>
  );
}
