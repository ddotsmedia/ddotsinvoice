'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cardCls, btnCls, thCls, trCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface AuditEntry {
  id: string;
  action: string;
  module: string | null;
  recordId: string | null;
  createdAt: string;
  userFirstName?: string;
  userLastName?: string;
  newValues?: unknown;
}

interface Page { items: AuditEntry[]; total: number; page: number; limit: number }

const ACTION_BADGE: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  deleted: 'bg-red-100 text-red-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-purple-100 text-purple-700',
};

function actionBadge(action: string) {
  const key = Object.keys(ACTION_BADGE).find((k) => action.toLowerCase().includes(k)) ?? '';
  return ACTION_BADGE[key] ?? 'bg-slate-100 text-slate-600';
}

const LIMIT = 50;

export default function SettingsAuditLogPage() {
  const L = useLabel();
  const [page, setPage] = useState(1);

  const log = useQuery({
    queryKey: ['settings-audit', page],
    queryFn: async () => (await api.get<Page>('/admin/audit-log', { params: { page, limit: LIMIT } })).data,
  });

  const pages = log.data ? Math.max(1, Math.ceil(log.data.total / LIMIT)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold text-primary">{L('Audit Log', 'سجل التدقيق')}</h1>
      <p className="text-sm text-muted">{L('Recent activity in your company account.', 'آخر النشاطات في حسابك.')}</p>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={thCls}>{L('Timestamp', 'الوقت')}</th>
              <th className={thCls}>{L('Action', 'الإجراء')}</th>
              <th className={thCls}>{L('Module', 'الوحدة')}</th>
              <th className={thCls}>{L('Record ID', 'المعرف')}</th>
              <th className={thCls}>{L('User', 'المستخدم')}</th>
            </tr>
          </thead>
          <tbody>
            {log.data?.items.map((r) => (
              <tr key={r.id} className={trCls}>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs" dir="ltr">{new Date(r.createdAt).toLocaleString('en-GB')}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionBadge(r.action)}`}>
                    {r.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted text-xs">{r.module ?? '—'}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted" dir="ltr">{r.recordId ? `${r.recordId.slice(0, 8)}…` : '—'}</td>
                <td className="px-4 py-2 text-xs">{[r.userFirstName, r.userLastName].filter(Boolean).join(' ') || '—'}</td>
              </tr>
            ))}
            {log.data && !log.data.items.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">{L('No audit entries yet.', 'لا توجد إدخالات بعد.')}</td></tr>
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
