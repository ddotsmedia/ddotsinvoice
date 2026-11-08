'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Eos { id: string; terminationDate: string; yearsOfService: string; lastBasicSalary: string; gratuityAmount: string; leaveEncashment: string; otherSettlements: string; totalAmount: string; status: string }

export default function EosDetailPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/hr/eos/${params.id}`;
  const eos = useQuery({ queryKey: ['eos', params.id], queryFn: async () => (await api.get<Eos>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'approve' | 'pay') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['eos', params.id] }),
  });
  const d = eos.data;
  if (!d) return <p className="text-slate-400">{eos.isError ? errMsg(eos.error) : '…'}</p>;
  const rows: [string, string][] = [
    [L('Years of service', 'سنوات الخدمة'), Number(d.yearsOfService).toFixed(2)],
    [L('Last basic salary', 'آخر راتب أساسي'), money(d.lastBasicSalary).toFixed(2)],
    [L('Gratuity', 'مكافأة نهاية الخدمة'), money(d.gratuityAmount).toFixed(2)],
    [L('Leave encashment', 'بدل الإجازات'), money(d.leaveEncashment).toFixed(2)],
    [L('Total', 'الإجمالي'), money(d.totalAmount).toFixed(2)],
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{d.terminationDate}</h1>
          <p className="text-sm text-slate-500">{d.status}</p>
        </div>
        <div className="flex gap-2">
          {d.status === 'draft' && <button type="button" className={btnCls} onClick={() => act.mutate('approve')}>{L('Approve', 'اعتماد')}</button>}
          {d.status === 'approved' && <button type="button" className={btnCls} onClick={() => act.mutate('pay')}>{L('Pay', 'صرف')}</button>}
        </div>
      </div>
      {act.isError && <p className="text-sm text-red-600">{errMsg(act.error)}</p>}
      <div className={`${cardCls} divide-y divide-border dark:divide-slate-800`}>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-6 py-3 text-sm">
            <span>{k}</span><span className="font-mono" dir="ltr">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
