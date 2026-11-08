'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface BankAccount { id: string; nameEn: string; nameAr: string }
interface Form { bankAccountId: string; date: string; type: 'deposit' | 'withdrawal' | 'bank_charge' | 'interest'; amount: string; description?: string; reference?: string }

export default function NewBankTxPage() {
  const L = useLabel();
  const router = useRouter();
  const banks = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<Paged<BankAccount>>('/payments/bank-accounts', { params: { limit: 100 } })).data });
  const { register, handleSubmit } = useForm<Form>({ defaultValues: { type: 'bank_charge', date: new Date().toISOString().slice(0, 10) } });
  const save = useMutation({
    mutationFn: async (v: Form) => (await api.post<{ id: string }>('/payments/bank-transactions', stripEmpty(v))).data,
    onSuccess: () => router.push('/dashboard/payments/bank-transactions'),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Bank Transaction', 'حركة بنكية جديدة')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} max-w-xl space-y-4 p-6`} noValidate>
        <Field label={L('Bank account', 'الحساب البنكي')}>
          <select className={inputCls} {...register('bankAccountId', { required: true })}>
            <option value="">—</option>
            {banks.data?.items.map((b) => <option key={b.id} value={b.id}>{L(b.nameEn, b.nameAr)}</option>)}
          </select>
        </Field>
        <Field label={L('Date', 'التاريخ')}><input type="date" dir="ltr" className={inputCls} {...register('date', { required: true })} /></Field>
        <Field label={L('Type', 'النوع')}>
          <select className={inputCls} {...register('type')}>
            <option value="bank_charge">{L('Bank charge', 'رسوم بنكية')}</option>
            <option value="interest">{L('Interest income', 'فائدة')}</option>
            <option value="deposit">{L('Other deposit', 'إيداع آخر')}</option>
            <option value="withdrawal">{L('Other withdrawal', 'سحب آخر')}</option>
          </select>
        </Field>
        <Field label={L('Amount', 'المبلغ')}><input dir="ltr" className={`${inputCls} text-end`} {...register('amount', { required: true })} /></Field>
        <Field label={L('Description', 'البيان')}><input className={inputCls} {...register('description')} /></Field>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end"><button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button></div>
      </form>
    </div>
  );
}
