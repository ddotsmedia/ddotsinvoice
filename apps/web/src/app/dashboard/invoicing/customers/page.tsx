'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';
import type { Customer } from '@/lib/invoicing-types';
import type { Paged } from '@/lib/accounting-types';

interface CustomerForm { name: string; nameAr?: string; trn?: string; email?: string; phone?: string; paymentTerms: number; currency: string }

export default function CustomersPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerForm>({
    defaultValues: { paymentTerms: 30, currency: 'AED' },
  });

  const list = useQuery({
    queryKey: ['customers', search],
    queryFn: async () =>
      (await api.get<Paged<Customer>>('/invoicing/customers', { params: { limit: 100, ...(search && { search }) } })).data,
  });

  const create = useMutation({
    mutationFn: async (v: CustomerForm) => (await api.post('/invoicing/customers', stripEmpty({ ...v, paymentTerms: Number(v.paymentTerms) }))).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      reset({ paymentTerms: 30, currency: 'AED' });
      setOpen(false);
    },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Customers', 'العملاء')}</h1>
        <div className="flex gap-2">
          <input className={`${inputCls} w-56`} placeholder={L('Search name or TRN', 'بحث بالاسم أو الرقم الضريبي')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className={btnCls} onClick={() => setOpen(true)}>{L('Add Customer', 'إضافة عميل')}</button>
        </div>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('TRN', 'الرقم الضريبي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((c) => (
              <tr key={c.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3"><Link className="text-primary hover:underline" href={`/dashboard/invoicing/customers/${c.id}`}>{c.name}</Link></td>
                <td className="px-4 py-3 font-mono" dir="ltr">{c.trn ?? '—'}</td>
                <td className="px-4 py-3 text-end font-mono" dir="ltr">{money(c.balance).toFixed(2)}</td>
                <td className="px-4 py-3">{c.isActive ? L('Active', 'نشط') : L('Inactive', 'غير نشط')}</td>
              </tr>
            ))}
            {!list.isLoading && !list.data?.items.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{L('No customers', 'لا يوجد عملاء')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onOpenChange={setOpen} title={L('Add Customer', 'إضافة عميل')}>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
          <Field label={L('Name', 'الاسم')} error={errors.name?.message}><input className={inputCls} {...register('name', { required: true })} /></Field>
          <Field label={L('Name (Arabic)', 'الاسم (عربي)')}><input className={inputCls} {...register('nameAr')} /></Field>
          <Field label={L('TRN', 'الرقم الضريبي')}><input dir="ltr" maxLength={15} inputMode="numeric" className={inputCls} {...register('trn')} /></Field>
          <Field label={L('Email', 'البريد')}><input dir="ltr" type="email" className={inputCls} {...register('email')} /></Field>
          <Field label={L('Phone', 'الهاتف')}><input dir="ltr" className={inputCls} {...register('phone')} /></Field>
          <Field label={L('Payment terms', 'شروط الدفع')}>
            <select className={inputCls} {...register('paymentTerms')}>
              {[0, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d === 0 ? 'Net 0' : `Net ${d}`}</option>)}
            </select>
          </Field>
          <Field label={L('Currency', 'العملة')}>
            <select className={inputCls} {...register('currency')}>
              {['AED', 'USD', 'EUR', 'GBP', 'SAR'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          {create.isError && <p className="text-sm text-red-600">{errMsg(create.error)}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-md px-4 py-2 text-sm" onClick={() => setOpen(false)}>{L('Cancel', 'إلغاء')}</button>
            <button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
