'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface BankAccount { id: string; nameEn: string; nameAr: string }
interface Form { bankAccountId: string; statementDate: string; openingBalance: string; closingBalance: string }

export default function NewReconciliationPage() {
  const L = useLabel();
  const router = useRouter();
  const banks = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<Paged<BankAccount>>('/payments/bank-accounts', { params: { limit: 100 } })).data });
  const { register, handleSubmit } = useForm<Form>({ defaultValues: { statementDate: new Date().toISOString().slice(0, 10), openingBalance: '0', closingBalance: '0' } });
  const save = useMutation({
    mutationFn: async (v: Form) => (await api.post<{ id: string }>('/payments/reconciliations', stripEmpty(v))).data,
    onSuccess: (d) => router.push(`/dashboard/payments/reconciliations/${d.id}`),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Reconciliation', 'تسوية جديدة')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-xl space-y-4 p-6`} noValidate>
        <Field label={L('Bank account', 'الحساب البنكي')}>
          <select className={inputCls} {...register('bankAccountId', { required: true })}>
            <option value="">—</option>
            {banks.data?.items.map((b) => <option key={b.id} value={b.id}>{L(b.nameEn, b.nameAr)}</option>)}
          </select>
        </Field>
        <Field label={L('Statement date', 'تاريخ الكشف')}><input type="date" dir="ltr" className={inputCls} {...register('statementDate', { required: true })} /></Field>
        <Field label={L('Opening balance', 'الرصيد الافتتاحي')}><input dir="ltr" className={`${inputCls} text-end`} {...register('openingBalance', { required: true })} /></Field>
        <Field label={L('Closing balance (statement)', 'الرصيد الختامي (الكشف)')}><input dir="ltr" className={`${inputCls} text-end`} {...register('closingBalance', { required: true })} /></Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Create', 'إنشاء')}</button></div>
      </form>
    </div>
  );
}
