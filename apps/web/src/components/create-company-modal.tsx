'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { companySchema, Currency } from '@ddotsinvoice/shared';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, inputCls } from '@/components/ui';

type CompanyForm = z.infer<typeof companySchema>;

const stripEmpty = (v: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new company id after successful creation */
  onSuccess?: (companyId: string) => void;
}

export function CreateCompanyModal({ open, onOpenChange, onSuccess }: Props) {
  const t = useTranslations();
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: { currency: Currency.AED },
  });

  const create = useMutation({
    mutationFn: async (v: CompanyForm) => (await api.post<{ id: string }>('/companies', stripEmpty(v))).data,
    onSuccess: (company) => {
      void qc.invalidateQueries({ queryKey: ['companies'] });
      void qc.invalidateQueries({ queryKey: ['companies-selector'] });
      reset();
      onOpenChange(false);
      onSuccess?.(company.id);
    },
    onError: (err: unknown) => {
      // Log full error details to console for debugging
      const axiosErr = err as { response?: { status?: number; data?: unknown } };
      console.error('[CreateCompany] error', axiosErr?.response?.status, JSON.stringify(axiosErr?.response?.data));
    },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('companies.add')}>
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
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSubmitting} className={`${btnCls} min-w-24 justify-center`}>
            {isSubmitting ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
