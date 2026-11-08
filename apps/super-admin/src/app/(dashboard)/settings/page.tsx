'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { btnCls, cardCls, inputCls, Notice, PageHeader } from '@/components/ui';

interface Settings {
  platformName: string; logoUrl: string | null; defaultCurrency: string; defaultVatRate: string;
  smtpHost: string | null; smtpPort: number | null; smtpUser: string | null; smtpPassSet: boolean; maintenanceMode: boolean;
}

const label = 'mb-1 block text-sm font-medium text-primary';

export default function SettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<Settings>('/super-admin/settings')).data });
  const [form, setForm] = useState<Settings & { smtpPass: string }>();
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (q.data) setForm({ ...q.data, smtpPass: '' });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (f: Settings & { smtpPass: string }) => {
      // SMTP password is only sent when the admin typed a new one
      const body: Record<string, unknown> = { ...f };
      delete body.smtpPassSet;
      if (!f.smtpPass) delete body.smtpPass;
      return api.patch('/super-admin/settings', body);
    },
    onSuccess: () => {
      setNotice({ kind: 'success', text: 'Settings saved.' });
      void qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => setNotice({ kind: 'error', text: apiError(e) }),
  });

  if (!form) return <p className="text-sm text-secondary">Loading…</p>;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    save.mutate(form);
  };

  return (
    <>
      <PageHeader title="Platform Settings" subtitle="Global configuration for DdotsInvoice" />
      {notice && <Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice>}
      <form onSubmit={submit} className="space-y-6">
        <section className={`${cardCls} space-y-4 p-6`}>
          <h2 className="font-semibold text-primary">General</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Platform name</label><input className={inputCls} value={form.platformName} onChange={(e) => set('platformName', e.target.value)} /></div>
            <div>
              <label className={label}>Logo URL</label>
              <div className="flex gap-2">
                <input className={inputCls} value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value || null)} placeholder="https://…" />
                <button type="button" disabled className="h-10 shrink-0 rounded-lg border border-border px-3 text-xs text-muted" title="Upload coming soon">Upload</button>
              </div>
            </div>
            <div><label className={label}>Default currency</label><input className={inputCls} maxLength={3} value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value.toUpperCase())} /></div>
            <div><label className={label}>Default VAT rate (%)</label><input className={inputCls} type="number" step="0.01" min="0" value={form.defaultVatRate} onChange={(e) => set('defaultVatRate', e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-3 text-sm text-primary">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={form.maintenanceMode} onChange={(e) => set('maintenanceMode', e.target.checked)} />
            Maintenance mode (blocks tenant sign-ins)
          </label>
        </section>

        <section className={`${cardCls} space-y-4 p-6`}>
          <h2 className="font-semibold text-primary">SMTP</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className={label}>Host</label><input className={inputCls} value={form.smtpHost ?? ''} onChange={(e) => set('smtpHost', e.target.value || null)} /></div>
            <div><label className={label}>Port</label><input className={inputCls} type="number" value={form.smtpPort ?? ''} onChange={(e) => set('smtpPort', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><label className={label}>Username</label><input className={inputCls} value={form.smtpUser ?? ''} onChange={(e) => set('smtpUser', e.target.value || null)} /></div>
            <div>
              <label className={label}>Password</label>
              <input className={inputCls} type="password" autoComplete="new-password" value={form.smtpPass} placeholder={form.smtpPassSet ? '•••••••• (leave blank to keep)' : ''} onChange={(e) => set('smtpPass', e.target.value)} />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={save.isPending} className={btnCls}>{save.isPending ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </>
  );
}
