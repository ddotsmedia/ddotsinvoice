'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';

interface Form { periodYear: number; periodMonth: number }

export default function NewPayrollPage() {
  const L = useLabel();
  const router = useRouter();
  const now = new Date();
  const { register, handleSubmit } = useForm<Form>({ defaultValues: { periodYear: now.getUTCFullYear(), periodMonth: now.getUTCMonth() + 1 } });
  const save = useMutation({
    mutationFn: async (v: Form) => (await api.post<{ id: string }>('/hr/payroll/generate', { periodYear: Number(v.periodYear), periodMonth: Number(v.periodMonth) })).data,
    onSuccess: (d) => router.push(`/dashboard/hr/payroll/${d.id}`),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('Generate Payroll', 'إنشاء مسير رواتب')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-md space-y-4 p-6`} noValidate>
        <Field label={L('Year', 'السنة')}><input type="number" dir="ltr" className={inputCls} {...register('periodYear', { required: true })} /></Field>
        <Field label={L('Month', 'الشهر')}><input type="number" min={1} max={12} dir="ltr" className={inputCls} {...register('periodMonth', { required: true })} /></Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Generate', 'إنشاء')}</button></div>
      </form>
    </div>
  );
}
