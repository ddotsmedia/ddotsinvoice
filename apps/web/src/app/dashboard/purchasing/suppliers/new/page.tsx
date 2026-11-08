'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';

interface SupplierForm { code: string; nameEn: string; nameAr: string; trn?: string; paymentTerms: number }

export default function NewSupplierPage() {
  const L = useLabel();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierForm>({ defaultValues: { paymentTerms: 30 } });
  const save = useMutation({
    mutationFn: async (v: SupplierForm) => (await api.post<{ id: string }>('/purchasing/suppliers', stripEmpty({ ...v, paymentTerms: Number(v.paymentTerms) }))).data,
    onSuccess: () => router.push('/dashboard/purchasing/suppliers'),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Supplier', 'مورد جديد')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-xl space-y-4 p-6`} noValidate>
        <Field label={L('Code', 'الرمز')} error={errors.code?.message}><input dir="ltr" className={inputCls} {...register('code', { required: true })} /></Field>
        <Field label={L('Name (English)', 'الاسم (إنجليزي)')}><input className={inputCls} {...register('nameEn', { required: true })} /></Field>
        <Field label={L('Name (Arabic)', 'الاسم (عربي)')}><input className={inputCls} {...register('nameAr', { required: true })} /></Field>
        <Field label={L('TRN', 'الرقم الضريبي')} error={errors.trn?.message}><input dir="ltr" maxLength={15} className={inputCls} {...register('trn')} /></Field>
        <Field label={L('Payment terms (days)', 'شروط الدفع (أيام)')}>
          <select className={inputCls} {...register('paymentTerms')}>
            {[0, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button></div>
      </form>
    </div>
  );
}
