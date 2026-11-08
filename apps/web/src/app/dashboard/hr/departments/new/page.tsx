'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';

interface Form { code: string; nameEn: string; nameAr: string }

export default function NewDepartmentPage() {
  const L = useLabel();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>();
  const save = useMutation({
    mutationFn: async (v: Form) => (await api.post('/hr/departments', stripEmpty(v))).data,
    onSuccess: () => router.push('/dashboard/hr/departments'),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Department', 'قسم جديد')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-xl space-y-4 p-6`} noValidate>
        <Field label={L('Code', 'الرمز')} error={errors.code?.message}><input dir="ltr" className={inputCls} {...register('code', { required: true })} /></Field>
        <Field label={L('Name (English)', 'الاسم (إنجليزي)')}><input className={inputCls} {...register('nameEn', { required: true })} /></Field>
        <Field label={L('Name (Arabic)', 'الاسم (عربي)')}><input className={inputCls} {...register('nameAr', { required: true })} /></Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button></div>
      </form>
    </div>
  );
}
