'use client';

import { use } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Emp {
  id: string; employeeNumber: string; nameEn: string; nameAr: string; jobTitle: string; status: string; hireDate: string; terminationDate: string | null;
  salary: { basicSalary: string; housingAllowance: string; transportAllowance: string; otherAllowances: string; grossSalary: string } | null;
  leaveBalances: { code: string; balance: string; taken: string }[];
}

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rid } = use(params);
  const L = useLabel();
  const router = useRouter();
  const emp = useQuery({ queryKey: ['employee', rid], queryFn: async () => (await api.get<Emp>(`/hr/employees/${rid}`)).data });
  const terminate = useMutation({
    mutationFn: async () => (await api.post(`/hr/employees/${rid}/terminate`, { terminationDate: new Date().toISOString().slice(0, 10) })).data,
    onSuccess: () => void emp.refetch(),
  });
  const eos = useMutation({
    mutationFn: async () => (await api.post<{ id: string }>('/hr/eos/calculate', { employeeId: rid })).data,
    onSuccess: (d) => router.push(`/dashboard/hr/eos/${d.id}`),
  });
  const d = emp.data;
  if (!d) return <p className="text-slate-400">{emp.isError ? errMsg(emp.error) : '…'}</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{L(d.nameEn, d.nameAr)}</h1>
          <p className="text-sm text-slate-500" dir="ltr">{d.employeeNumber} · {d.jobTitle} · {d.status}</p>
        </div>
        <div className="flex gap-2">
          {d.status === 'active' && <button type="button" className="rounded-md border border-border px-4 py-2 text-sm text-red-600" onClick={() => terminate.mutate()}>{L('Terminate', 'إنهاء الخدمة')}</button>}
          {d.status === 'terminated' && <button type="button" className={btnCls} onClick={() => eos.mutate()}>{L('Calculate EOS', 'احتساب نهاية الخدمة')}</button>}
        </div>
      </div>
      {(terminate.isError || eos.isError) && <p className="text-sm text-red-600">{errMsg(terminate.error ?? eos.error)}</p>}

      <div className={`${cardCls} grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-5`} dir="ltr">
        <div><div className="text-slate-500">Basic</div><div className="font-mono">{money(d.salary?.basicSalary ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Housing</div><div className="font-mono">{money(d.salary?.housingAllowance ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Transport</div><div className="font-mono">{money(d.salary?.transportAllowance ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Other</div><div className="font-mono">{money(d.salary?.otherAllowances ?? '0').toFixed(2)}</div></div>
        <div><div className="text-slate-500">Gross</div><div className="font-mono font-bold">{money(d.salary?.grossSalary ?? '0').toFixed(2)}</div></div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Leave type', 'نوع الإجازة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Taken', 'المأخوذ')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
            </tr>
          </thead>
          <tbody>
            {d.leaveBalances.map((b) => (
              <tr key={b.code} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{b.code}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(b.taken).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(b.balance).toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
