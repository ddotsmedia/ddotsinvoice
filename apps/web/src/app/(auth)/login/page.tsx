'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { loginSchema } from '@ddotsinvoice/shared';
import type { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useUi } from '@/app/providers';
import { Field, inputCls } from '@/components/ui';
import { CheckCircle2, FileText, Globe2, ShieldCheck } from 'lucide-react';

type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: FileText, title: 'UAE-Ready Invoicing', desc: 'TRN, VAT 5%, AED — built for local compliance' },
  { icon: ShieldCheck, title: 'Secure & Encrypted', desc: 'Bank-grade security for your financial data' },
  { icon: Globe2, title: 'Arabic & English', desc: 'Full bilingual support across all documents' },
];

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
    <main className="flex min-h-screen">
      {/* Left branded panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(145deg, #0A1628 0%, #1A3A6B 50%, #1E4FC2 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">DdotsInvoice</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Invoicing<br />for UAE Businesses
          </h1>
          <p className="text-white/70 text-lg mb-12">
            Streamline your finances with VAT-compliant invoicing, payroll, and accounting — all in one platform.
          </p>

          <div className="space-y-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{f.title}</div>
                    <div className="text-sm text-white/60">{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/40 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Trusted by businesses across the UAE
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">DdotsInvoice</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-xl p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</h2>
                <p className="mt-1 text-sm text-slate-500">Welcome back — sign in to your account</p>
              </div>
              <button
                type="button"
                onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {locale === 'ar' ? 'EN' : 'عربي'}
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <Field label={t('email')} error={errors.email?.message}>
                <input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@company.ae"
                  className={`${inputCls} h-11`}
                  {...register('email')}
                />
              </Field>
              <Field label={t('password')} error={errors.password?.message}>
                <input
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputCls} h-11`}
                  {...register('password')}
                />
              </Field>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-lg bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </>
                ) : t('submit')}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-700" />
            </div>

            <Link
              href="/register"
              className="mt-6 flex h-11 w-full items-center justify-center rounded-lg border-2 border-brand-500 text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors"
            >
              Start Free Trial
            </Link>

            <p className="mt-4 text-center text-xs text-slate-400">
              No credit card required · 14-day free trial
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
