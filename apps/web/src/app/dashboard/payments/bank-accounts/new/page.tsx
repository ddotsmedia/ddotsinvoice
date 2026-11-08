'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';

interface Form { code: string; nameEn: string; nameAr: string; bankName: string; accountNumber: string; iban?: string; currency: string; glAccountId: string }
interface Acc { id: string; code: string; name: string; isHeader: boolean; type: string; children: Acc[] }
const flat = (n: Acc[]): Acc[] => n.flatMap((x) => [x, ...flat(x.children)]);

export default function NewBankAccountPage() {
  const L = useLabel();
  const router = useRouter();
  const tree = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get<Acc[]>('/accounting/accounts')).data });
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { currency: 'AED' } });
  const save = useMutation({
    mutationFn: async (v: Form) => (await api.post('/payments/bank-accounts', stripEmpty(v))).data,
    onSuccess: () => router.push('/dashboard/payments/bank-accounts'),
  });
  const gl = flat(tree.data ?? []).filter((a) => a.type === 'asset' && !a.isHeader);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Bank Account', 'حساب بنكي جديد')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-xl space-y-4 p-6`} noValidate>
        <Field label={L('Code', 'الرمز')} error={errors.code?.message}><input dir="ltr" className={inputCls} {...register('code', { required: true })} /></Field>
        <Field label={L('Name (English)', 'الاسم (إنجليزي)')}><input className={inputCls} {...register('nameEn', { required: true })} /></Field>
        <Field label={L('Name (Arabic)', 'الاسم (عربي)')}><input className={inputCls} {...register('nameAr', { required: true })} /></Field>
        <Field label={L('Bank name', 'اسم البنك')}><input className={inputCls} {...register('bankName', { required: true })} /></Field>
        <Field label={L('Account number', 'رقم الحساب')}><input dir="ltr" className={inputCls} {...register('accountNumber', { required: true })} /></Field>
        <Field label="IBAN" error={errors.iban?.message}><input dir="ltr" className={inputCls} {...register('iban')} /></Field>
        <Field label={L('GL account', 'الحساب في دليل الحسابات')}>
          <select className={inputCls} {...register('glAccountId', { required: true })}>
            <option value="">—</option>
            {gl.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
        </Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button></div>
      </form>
    </div>
  );
}
