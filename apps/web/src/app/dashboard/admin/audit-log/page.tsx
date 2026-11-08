'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls, Field, inputCls, thCls, trCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import { AdminUser, AuditRow, fullName, MODULES, shortJson } from '@/lib/admin';

interface Page { items: AuditRow[]; total: number; page: number; limit: number }

const LIMIT = 20;

export default function AdminAuditLogPage() {
  const L = useLabel();
  const [filters, setFilters] = useState({ userId: '', module: '', fromDate: '', toDate: '' });
  const [page, setPage] = useState(1);

  const users = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get<AdminUser[]>('/admin/users')).data });
  const log = useQuery({
    queryKey: ['admin-audit', filters, page],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries({ ...filters, page, limit: LIMIT }).filter(([, v]) => v !== ''));
      return (await api.get<Page>('/admin/audit-log', { params })).data;
    },
  });

  const setF = (k: keyof typeof filters) => (e: { target: { value: string } }) => {
    setFilters({ ...filters, [k]: e.target.value });
    setPage(1);
  };
  const pages = log.data ? Math.max(1, Math.ceil(log.data.total / LIMIT)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold text-primary">{L('Audit Log', 'سجل التدقيق')}</h1>

      <div className={`${cardCls} grid gap-4 p-4 md:grid-cols-4`}>
        <Field label={L('User', 'المستخدم')}>
          <select className={inputCls} value={filters.userId} onChange={setF('userId')}>
            <option value="">{L('All users', 'جميع المستخدمين')}</option>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{fullName(u)}</option>)}
          </select>
        </Field>
        <Field label={L('Module', 'الوحدة')}>
          <select className={inputCls} value={filters.module} onChange={setF('module')}>
            <option value="">{L('All modules', 'جميع الوحدات')}</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label={L('From', 'من')}>
          <input type="date" dir="ltr" className={inputCls} value={filters.fromDate} onChange={setF('fromDate')} />
        </Field>
        <Field label={L('To', 'إلى')}>
          <input type="date" dir="ltr" className={inputCls} value={filters.toDate} onChange={setF('toDate')} />
        </Field>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={thCls}>{L('Timestamp', 'التوقيت')}</th>
              <th className={thCls}>{L('User', 'المستخدم')}</th>
              <th className={thCls}>{L('Action', 'الإجراء')}</th>
              <th className={thCls}>{L('Module', 'الوحدة')}</th>
              <th className={thCls}>{L('Record ID', 'معرف السجل')}</th>
              <th className={thCls}>{L('Old value', 'القيمة القديمة')}</th>
              <th className={thCls}>{L('New value', 'القيمة الجديدة')}</th>
            </tr>
          </thead>
          <tbody>
            {log.data?.items.map((r) => (
              <tr key={r.id} className={trCls}>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs" dir="ltr">{new Date(r.createdAt).toLocaleString('en-GB')}</td>
                <td className="px-4 py-2">{fullName({ firstName: r.userFirstName, lastName: r.userLastName })}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2">{r.module ?? '—'}</td>
                <td className="px-4 py-2 font-mono text-xs" dir="ltr">{r.recordId ?? '—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{shortJson(r.oldValues)}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{shortJson(r.newValues)}</td>
              </tr>
            ))}
            {log.data && !log.data.items.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">{L('No entries', 'لا توجد إدخالات')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 text-sm">
        <button type="button" className={btnCls} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{L('Previous', 'السابق')}</button>
        <span className="text-secondary">{page} / {pages}</span>
        <button type="button" className={btnCls} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{L('Next', 'التالي')}</button>
      </div>
    </div>
  );
}
