'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface Emp { id: string; employeeNumber: string; nameEn: string; nameAr: string; status: string }

export default function EosPage() {
  const L = useLabel();
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const emps = useQuery({ queryKey: ['employees', ''], queryFn: async () => (await api.get<Paged<Emp>>('/hr/employees', { params: { limit: 100 } })).data });
  const calc = useMutation({
    mutationFn: async () => (await api.post<{ id: string }>('/hr/eos/calculate', { employeeId })).data,
    onSuccess: (d) => router.push(`/dashboard/hr/eos/${d.id}`),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('End of Service', 'نهاية الخدمة')}</h1>
      <div className={`${cardCls} max-w-xl space-y-4 p-6`}>
        <Field label={L('Employee', 'الموظف')}>
          <select className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">—</option>
            {emps.data?.items.map((e) => <option key={e.id} value={e.id}>{e.employeeNumber} {L(e.nameEn, e.nameAr)}</option>)}
          </select>
        </Field>
        {calc.isError && <p className="text-sm text-red-600">{errMsg(calc.error)}</p>}
        <div className="flex justify-end">
          <button type="button" className={btnCls} disabled={!employeeId || calc.isPending} onClick={() => calc.mutate()}>{L('Calculate', 'احتساب')}</button>
        </div>
      </div>
    </div>
  );
}
