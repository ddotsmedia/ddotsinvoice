'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { companySchema, Currency } from '@ddotsinvoice/shared';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, cardCls, inputCls } from '@/components/ui';

type CompanyForm = z.infer<typeof companySchema>;
interface Company { id: string; name: string; trn: string | null; currency: string; isActive: boolean }
interface Paged<T> { items: T[]; total: number }

const stripEmpty = (v: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined));

export default function CompaniesPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ['companies'],
    queryFn: async () => (await api.get<Paged<Company>>('/companies', { params: { limit: 100 } })).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyForm>({ resolver: zodResolver(companySchema), defaultValues: { currency: Currency.AED } });

  const create = useMutation({
    mutationFn: async (v: CompanyForm) => (await api.post<{ id: string }>('/companies', stripEmpty(v))).data,
    onSuccess: (company) => {
      void qc.invalidateQueries({ queryKey: ['companies'] });
      reset();
      setOpen(false);
      // After first company, prompt to create an invoice
      router.push(`/dashboard/invoicing?company=${company.id}&new=1`);
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('companies.title')}</h1>
        <button type="button" className={btnCls} onClick={() => setOpen(true)}>
          {t('companies.add')}
        </button>
      </div>

      {!list.isLoading && list.data?.total === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-4 py-16 text-center`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
            <svg className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Set up your first company</p>
            <p className="mt-1 text-sm text-slate-400">Add a company to start creating invoices and tracking finances.</p>
          </div>
          <button type="button" className={btnCls} onClick={() => setOpen(true)}>
            Create your first company
          </button>
        </div>
      ) : (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('common.name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.trn')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.currency')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((c) => (
                <tr key={c.id} className="border-t border-border dark:border-slate-800">
                  <td className="px-4 py-3">{c.name}</td>
                  <td className="px-4 py-3" dir="ltr">{c.trn ?? '—'}</td>
                  <td className="px-4 py-3">{c.currency}</td>
                  <td className="px-4 py-3">{c.isActive ? t('common.active') : t('common.inactive')}</td>
                </tr>
              ))}
              {list.isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title={t('companies.add')}>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
          <Field label={t('common.name')} error={errors.name?.message}>
            <input className={inputCls} {...register('name')} />
          </Field>
          <Field label={t('common.nameAr')} error={errors.nameAr?.message}>
            <input className={inputCls} {...register('nameAr')} />
          </Field>
          <Field label={t('common.trn')} error={errors.trn?.message}>
            <input dir="ltr" inputMode="numeric" maxLength={15} className={inputCls} {...register('trn')} />
          </Field>
          <Field label={t('common.email')} error={errors.email?.message}>
            <input dir="ltr" type="email" className={inputCls} {...register('email')} />
          </Field>
          <Field label={t('common.phone')} error={errors.phone?.message}>
            <input dir="ltr" className={inputCls} {...register('phone')} />
          </Field>
          <Field label={t('common.currency')} error={errors.currency?.message}>
            <select className={inputCls} {...register('currency')}>
              {Object.values(Currency).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          {create.isError && <p className="text-sm text-red-600">{t('common.error')}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-md px-4 py-2 text-sm" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className={btnCls}>
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
