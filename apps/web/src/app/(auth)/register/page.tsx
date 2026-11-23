'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { api, setAccessToken } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Field, inputCls } from '@/components/ui';
import { CheckCircle2, ChevronDown, FileText, Zap } from 'lucide-react';

const schema = z.object({
  tenantName: z.string().min(2, 'Company name required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters'),
  phone: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  referralSource: z.string().max(100).optional(),
});
type Form = z.infer<typeof schema>;

function PasswordStrength({ value }: { value: string }) {
  const len = value.length;
  const hasUpper = /[A-Z]/.test(value);
  const hasNum = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const score = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpecial ? 1 : 0);
  if (!value) return null;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score - 1] : 'bg-slate-200'}`} />
        ))}
      </div>
      <span className="text-xs text-slate-500">Password strength: <span className="font-medium">{labels[score - 1] ?? 'Too short'}</span></span>
    </div>
  );
}

const perks = [
  'VAT-compliant invoices (UAE TRN)',
  'Full payroll & HR module',
  'Real-time financial reports',
  'Arabic & English documents',
];

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const { data } = await api.post<{ accessToken: string; user: unknown }>('/auth/register-tenant', v);
      setAccessToken(data.accessToken);
      qc.setQueryData(['me'], data.user);
      router.replace('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
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

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 mb-6">
            <Zap className="h-4 w-4 text-amber-400" />
            Get started in 60 seconds
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Launch your<br />business finance hub
          </h1>
          <p className="text-white/70 text-lg mb-12">
            Join UAE businesses using DdotsInvoice to manage invoicing, payroll, and accounting in one place.
          </p>

          <div className="space-y-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                <span className="text-white/80">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-5">
          <p className="text-white/60 text-sm italic mb-2">
            "DdotsInvoice saved us hours every week. The VAT invoicing is perfect for our UAE clients."
          </p>
          <div className="text-white/40 text-xs">— Finance Manager, Dubai SME</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">DdotsInvoice</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Start Free Trial</h2>
              <p className="mt-1 text-sm text-slate-500">Create your DdotsInvoice account — no credit card needed</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <Field label="Company Name" error={errors.tenantName?.message}>
                <input
                  className={`${inputCls} h-11`}
                  placeholder="Acme Trading LLC"
                  {...register('tenantName')}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" error={errors.firstName?.message}>
                  <input className={`${inputCls} h-11`} placeholder="Ahmad" {...register('firstName')} />
                </Field>
                <Field label="Last Name" error={errors.lastName?.message}>
                  <input className={`${inputCls} h-11`} placeholder="Al Rashidi" {...register('lastName')} />
                </Field>
              </div>

              <Field label="Work Email" error={errors.email?.message}>
                <input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@company.ae"
                  className={`${inputCls} h-11`}
                  {...register('email')}
                />
              </Field>

              <div>
                <Field label="Password" error={errors.password?.message}>
                  <input
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className={`${inputCls} h-11`}
                    {...register('password', {
                      onChange: (e) => setPasswordValue(e.target.value),
                    })}
                  />
                </Field>
                <PasswordStrength value={passwordValue} />
              </div>

              {/* Optional fields toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
                >
                  <span>Optional — help us improve DdotsInvoice</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                </button>

                {showOptional && (
                  <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                    <Field label="Phone Number">
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="+971 50 XXX XXXX"
                        className={`${inputCls} h-10`}
                        {...register('phone')}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Country">
                        <select className={`${inputCls} h-10`} {...register('country')}>
                          <option value="">Select country</option>
                          <option>UAE</option>
                          <option>Saudi Arabia</option>
                          <option>Qatar</option>
                          <option>Kuwait</option>
                          <option>Bahrain</option>
                          <option>Oman</option>
                          <option>Egypt</option>
                          <option>India</option>
                          <option>Pakistan</option>
                          <option>UK</option>
                          <option>USA</option>
                          <option>Other</option>
                        </select>
                      </Field>

                      <Field label="Company Size">
                        <select className={`${inputCls} h-10`} {...register('companySize')}>
                          <option value="">Select size</option>
                          <option>1–10</option>
                          <option>11–50</option>
                          <option>51–200</option>
                          <option>201–500</option>
                          <option>500+</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Industry">
                      <select className={`${inputCls} h-10`} {...register('industry')}>
                        <option value="">Select industry</option>
                        <option>Technology</option>
                        <option>Finance & Accounting</option>
                        <option>Real Estate</option>
                        <option>Retail & Trading</option>
                        <option>Healthcare</option>
                        <option>Construction</option>
                        <option>Hospitality</option>
                        <option>Manufacturing</option>
                        <option>Consulting</option>
                        <option>Other</option>
                      </select>
                    </Field>

                    <Field label="How did you hear about us?">
                      <select className={`${inputCls} h-10`} {...register('referralSource')}>
                        <option value="">Select source</option>
                        <option>Google Search</option>
                        <option>Social Media</option>
                        <option>Referral</option>
                        <option>Event</option>
                        <option>Other</option>
                      </select>
                    </Field>
                  </div>
                )}
              </div>

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
                    Creating account…
                  </>
                ) : 'Create Free Account'}
              </button>

              <p className="text-center text-xs text-slate-400">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
