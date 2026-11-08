'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { btnCls, cardCls, Field, inputCls } from '@/components/ui';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { COMPANY_ROLES } from '@/lib/admin';

interface InviteResult { user: { email: string }; tempPassword: string; emailSent: boolean }

export default function InviteUserPage() {
  const L = useLabel();
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer' });
  const [result, setResult] = useState<InviteResult | null>(null);

  const invite = useMutation({
    mutationFn: async () => (await api.post<InviteResult>('/admin/users/invite', form)).data,
    onSuccess: (r) => { setResult(r); toast.success(L('User invited', 'تمت دعوة المستخدم')); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    invite.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-primary">{L('Invite user', 'دعوة مستخدم')}</h1>

      <form onSubmit={submit} className={`${cardCls} space-y-4 p-6`}>
        <Field label={L('Name', 'الاسم')}>
          <input required minLength={2} className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={L('Email', 'البريد الإلكتروني')}>
          <input required type="email" dir="ltr" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={L('Role', 'الدور')}>
          <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {COMPANY_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <button type="submit" disabled={invite.isPending} className={btnCls}>
          {L('Send invitation', 'إرسال الدعوة')}
        </button>
      </form>

      {result && (
        <div className={`${cardCls} space-y-2 border-s-4 border-s-accent p-5 text-sm`}>
          <div className="font-semibold text-primary">{L('Temporary password (shown once)', 'كلمة المرور المؤقتة (تظهر مرة واحدة)')}</div>
          <div className="text-secondary">{result.user.email}</div>
          <code className="block rounded-md bg-surface-2 px-3 py-2 font-mono text-sm" dir="ltr">{result.tempPassword}</code>
          <p className="text-xs text-muted">
            {L(
              'Email delivery is not configured yet. Share this password securely; the user should change it after first login.',
              'لم يتم إعداد إرسال البريد بعد. شارك كلمة المرور بأمان.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
