'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Line { id: string; employeeId: string; grossSalary: string; deductions: string; netSalary: string; paidDays: string }
interface Run { id: string; periodYear: number; periodMonth: number; status: string; totalGross: string; totalNet: string; wpsFileName: string | null; lines: Line[] }

export default function PayrollRunPage({ params }: { params: { id: string } }) {
  const L = useLabel();
  const qc = useQueryClient();
  const base = `/hr/payroll/${params.id}`;
  const run = useQuery({ queryKey: ['payroll-run', params.id], queryFn: async () => (await api.get<Run>(base)).data });
  const act = useMutation({
    mutationFn: async (a: 'approve' | 'pay' | 'cancel') => (await api.post(`${base}/${a}`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['payroll-run', params.id] }),
  });
  const downloadWps = async () => {
    const r = await api.get(`${base}/wps`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = run.data?.wpsFileName ?? 'WPS.sif';
    a.click();
    URL.revokeObjectURL(url);
  };
  const d = run.data;
  if (!d) return <p className="text-slate-400">{run.isError ? errMsg(run.error) : '…'}</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold" dir="ltr">{d.periodYear}-{String(d.periodMonth).padStart(2, '0')}</h1>
          <p className="text-sm text-slate-500">{d.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {d.status === 'draft' && <button type="button" className={btnCls} onClick={() => act.mutate('approve')}>{L('Approve', 'اعتماد')}</button>}
          {d.status === 'approved' && <button type="button" className={btnCls} onClick={() => act.mutate('pay')}>{L('Pay', 'صرف')}</button>}
          {(d.status === 'approved' || d.status === 'paid') && (
            <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" onClick={() => void downloadWps()}>{L('Download WPS', 'تحميل ملف WPS')}</button>
          )}
          {(d.status === 'draft' || d.status === 'approved') && (
            <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => act.mutate('cancel')}>{L('Cancel', 'إلغاء')}</button>
          )}
        </div>
      </div>
      {act.isError && <p className="text-sm text-red-600">{errMsg(act.error)}</p>}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Employee', 'الموظف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Paid days', 'أيام العمل')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Gross', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Deductions', 'الخصومات')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Net', 'الصافي')}</th>
            </tr>
          </thead>
          <tbody>
            {d.lines.map((l) => (
              <tr key={l.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{l.employeeId.slice(0, 8)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{Number(l.paidDays)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.grossSalary).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.deductions).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(l.netSalary).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
              <td className="px-4 py-2" colSpan={2}>{L('Totals', 'الإجمالي')}</td>
              <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(d.totalGross).toFixed(2)}</td>
              <td />
              <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(d.totalNet).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
