'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface PdcCheque {
  id: string; type: string; chequeNumber: string; bankName: string | null;
  amount: string; currency: string; dueDate: string; status: string;
  reference: string | null; customerName: string | null; supplierName: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  presented: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cleared: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bounced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUSES = ['', 'pending', 'presented', 'cleared', 'bounced', 'cancelled', 'returned'];
const TYPES = ['', 'received', 'issued'];

export default function PdcRegisterPage() {
  const L = useLabel();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery<PdcCheque[]>({
    queryKey: ['pdc', type, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      return (await api.get(`/pdc?${params}`)).data;
    },
  });

  const summary = useQuery({
    queryKey: ['pdc-summary'],
    queryFn: async () => (await api.get('/pdc/summary')).data,
  });

  const totals = (summary.data as { type: string; status: string; count: number; total: string }[] | undefined)?.reduce(
    (acc: { received: number; issued: number }, r) => {
      if (r.status === 'pending' || r.status === 'presented') {
        if (r.type === 'received') acc.received += Number(r.total ?? 0);
        if (r.type === 'issued') acc.issued += Number(r.total ?? 0);
      }
      return acc;
    },
    { received: 0, issued: 0 },
  );

  const fmt = (n: number) => n.toLocaleString('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('PDC Register', 'سجل الشيكات الآجلة')}</h1>
        <Link href="/dashboard/payments/pdc/new" className={btnCls}>
          <Plus className="me-1 h-4 w-4" />
          {L('New Cheque', 'شيك جديد')}
        </Link>
      </div>

      {/* KPI strip */}
      {totals && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className={`${cardCls} p-4`}>
            <p className="text-xs text-muted">{L('Receivable PDC (pending/presented)', 'شيكات مستلمة معلقة')}</p>
            <p className="mt-1 text-lg font-semibold text-green-600 tabular-nums dark:text-green-400">{fmt(totals.received)}</p>
          </div>
          <div className={`${cardCls} p-4`}>
            <p className="text-xs text-muted">{L('Payable PDC (pending/presented)', 'شيكات صادرة معلقة')}</p>
            <p className="mt-1 text-lg font-semibold text-red-500 tabular-nums dark:text-red-400">{fmt(totals.issued)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm shadow-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">{L('All Types', 'كل الأنواع')}</option>
          {TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{L(t === 'received' ? 'Received' : 'Issued', t === 'received' ? 'مستلم' : 'صادر')}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm shadow-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{L('All Statuses', 'كل الحالات')}</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Cheque #', 'رقم الشيك')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Type', 'النوع')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Party', 'الطرف')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Bank', 'البنك')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Amount', 'المبلغ')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Due Date', 'تاريخ الاستحقاق')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">{L('Loading…', 'جاري التحميل…')}</td></tr>
            )}
            {data?.map((c) => {
              const party = c.type === 'received' ? c.customerName : c.supplierName;
              const overdue = c.status === 'pending' && c.dueDate < today;
              return (
                <tr key={c.id} className="border-t border-border dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{c.chequeNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${c.type === 'received' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                      {L(c.type === 'received' ? 'RCV' : 'ISS', c.type === 'received' ? 'مستلم' : 'صادر')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{party ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.bankName ?? '—'}</td>
                  <td className="px-4 py-3 text-end font-mono font-medium tabular-nums" dir="ltr">
                    {Number(c.amount).toLocaleString('en-AE', { minimumFractionDigits: 2 })} {c.currency}
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs ${overdue ? 'text-red-500' : ''}`} dir="ltr">
                    {c.dueDate} {overdue && <span className="text-xs">(overdue)</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/payments/pdc/${c.id}`} className="text-xs text-brand-500 hover:underline">
                      {L('View', 'عرض')}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {data && !data.length && !isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {L('No post-dated cheques found.', 'لا توجد شيكات آجلة.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
