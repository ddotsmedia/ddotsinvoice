'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { loginSchema } from '@ddotsinvoice/shared';
import type { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useUi } from '@/app/providers';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('login');
  const { locale, setLocale } = useUi();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.email, v.password);
    } catch {
      setError(t('error'));
    }
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className={`${cardCls} w-full max-w-sm p-6`}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <button
            type="button"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="rounded-md border border-border px-2 py-1 text-sm dark:border-slate-700"
          >
            {locale === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label={t('email')} error={errors.email?.message}>
            <input type="email" dir="ltr" autoComplete="email" className={inputCls} {...register('email')} />
          </Field>
          <Field label={t('password')} error={errors.password?.message}>
            <input type="password" dir="ltr" autoComplete="current-password" className={inputCls} {...register('password')} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className={`${btnCls} w-full`}>
            {t('submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
