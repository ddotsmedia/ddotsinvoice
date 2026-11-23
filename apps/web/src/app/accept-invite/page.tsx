'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, Field, inputCls } from '@/components/ui';
import { errMsg } from '@/lib/ui-helpers';

function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '', confirm: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const accept = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/accept-invite', { token, firstName: form.firstName, lastName: form.lastName, password: form.password })).data,
    onSuccess: () => router.push('/login?invited=1'),
    onError: (e) => setFormError(errMsg(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.password.length < 8 || !/\d/.test(form.password)) return setFormError('Password must be at least 8 characters and contain at least one number');
    if (form.password !== form.confirm) return setFormError('Passwords do not match');
    accept.mutate();
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-700">This invitation link is missing its token.</p>
        <Link href="/login" className="text-sm font-medium text-brand-600 hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input required autoComplete="given-name" className={inputCls} value={form.firstName} onChange={set('firstName')} /></Field>
        <Field label="Last name"><input required autoComplete="family-name" className={inputCls} value={form.lastName} onChange={set('lastName')} /></Field>
      </div>
      <Field label="Password"><input required type="password" dir="ltr" autoComplete="new-password" className={inputCls} value={form.password} onChange={set('password')} /></Field>
      <Field label="Confirm password"><input required type="password" dir="ltr" autoComplete="new-password" className={inputCls} value={form.confirm} onChange={set('confirm')} /></Field>
      <p className="text-xs text-muted">At least 8 characters, including a number.</p>
      {formError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
      <button type="submit" disabled={accept.isPending || !form.firstName.trim() || !form.lastName.trim()} className={`${btnCls} w-full`}>
        {accept.isPending ? 'Creating account…' : 'Accept invitation'}
      </button>
    </form>
  );
}

// Public page: lives outside /dashboard so the auth middleware does not apply
export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-primary">Join DdotsInvoice</h1>
        <p className="mb-6 mt-1 text-sm text-secondary">Set up your account to accept the invitation.</p>
        <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </main>
  );
}
