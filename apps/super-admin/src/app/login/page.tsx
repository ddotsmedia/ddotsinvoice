'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { api, apiError, setAccessToken } from '@/lib/api';
import { btnCls, inputCls, Notice } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ accessToken: string; user: { role: string } }>('/auth/login', { email, password });
      setAccessToken(data.accessToken);
      if (data.user.role !== 'super_admin') {
        setAccessToken(null);
        await api.post('/auth/logout').catch(() => undefined);
        setError('This console is restricted to platform super administrators.');
        return;
      }
      router.replace('/');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-sidebar-bg p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white"><Shield className="h-5 w-5" /></div>
          <div>
            <div className="font-bold text-primary">DdotsInvoice</div>
            <div className="text-xs text-secondary">Super Admin Console</div>
          </div>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <label className="mb-1 block text-sm font-medium text-primary">Email</label>
        <input className={`${inputCls} mb-4`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mb-1 block text-sm font-medium text-primary">Password</label>
        <input className={`${inputCls} mb-6`} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={busy} className={`${btnCls} w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
