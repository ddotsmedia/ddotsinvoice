'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Req { id: string; startDate: string; endDate: string; days: string; status: string; notes: string | null }

export default function LeaveDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/hr/leaves/${params.id}`;
  const req = useQuery({ queryKey: ['leave', params.id], queryFn: async () => (await api.get<Req>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'approve' | 'reject') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leave', params.id] });
      void qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });
  const r = req.data;
  if (!r) return <p className="text-slate-400">{req.isError ? errMsg(req.error) : '…'}</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold" dir="ltr">{r.startDate} → {r.endDate}</h1>
      <div className={`${cardCls} space-y-2 p-6 text-sm`}>
        <div>{L('Days', 'الأيام')}: <span className="font-mono" dir="ltr">{Number(r.days)}</span></div>
        <div>{L('Status', 'الحالة')}: {r.status}</div>
        {r.notes && <div>{r.notes}</div>}
      </div>
      {r.status === 'pending' && (
        <div className="flex gap-2">
          <button type="button" className={btnCls} onClick={() => act.mutate('approve')}>{L('Approve', 'اعتماد')}</button>
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('reject')}>{L('Reject', 'رفض')}</button>
        </div>
      )}
      {act.isError && <p className="text-sm text-red-600">{errMsg(act.error)}</p>}
    </div>
  );
}
