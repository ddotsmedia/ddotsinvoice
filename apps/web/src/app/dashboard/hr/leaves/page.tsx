'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Req { id: string; startDate: string; endDate: string; days: string; status: string; employeeId: string }

export default function LeavesPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['leaves'],
    queryFn: async () => (await api.get<Paged<Req>>('/hr/leaves', { params: { limit: 100 } })).data,
  });
  const act = useMutation({
    mutationFn: async ({ id, a }: { id: string; a: 'approve' | 'reject' }) => (await api.post(`/hr/leaves/${id}/${a}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['leaves'] }),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('Leave Requests', 'طلبات الإجازة')}</h1>
      {act.isError && <p className="mb-4 text-sm text-red-600">{errMsg(act.error)}</p>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('From', 'من')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('To', 'إلى')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Days', 'الأيام')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((r) => (
              <tr key={r.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3" dir="ltr"><Link className="text-primary hover:underline" href={`/dashboard/hr/leaves/${r.id}`}>{r.startDate}</Link></td>
                <td className="px-4 py-3" dir="ltr">{r.endDate}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{Number(r.days)}</td>
                <td className="px-4 py-3">{r.status}</td>
                <td className="px-4 py-3">
                  {r.status === 'pending' && (
                    <span className="flex gap-3">
                      <button type="button" className="text-primary hover:underline" onClick={() => act.mutate({ id: r.id, a: 'approve' })}>{L('Approve', 'اعتماد')}</button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => act.mutate({ id: r.id, a: 'reject' })}>{L('Reject', 'رفض')}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
