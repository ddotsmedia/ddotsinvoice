'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { api, setAccessToken } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';

const schema = z.object({
  tenantName: z.string().min(2, 'Company name required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 characters'),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className={`${cardCls} w-full max-w-sm p-6`}>
        <h1 className="mb-1 text-xl font-semibold">Start Free Trial</h1>
        <p className="mb-6 text-sm text-slate-500">Create your DdotsInvoice account</p>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Company Name" error={errors.tenantName?.message}>
            <input className={inputCls} placeholder="Acme LLC" {...register('tenantName')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" error={errors.firstName?.message}>
              <input className={inputCls} {...register('firstName')} />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <input className={inputCls} {...register('lastName')} />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" dir="ltr" autoComplete="email" className={inputCls} {...register('email')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input type="password" dir="ltr" autoComplete="new-password" className={inputCls} {...register('password')} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className={`${btnCls} w-full`}>
            {isSubmitting ? 'Creating account…' : 'Create Free Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
