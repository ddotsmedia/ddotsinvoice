'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { btnCls, cardCls, Field, inputCls, Modal, thCls, trCls } from '@/components/ui';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { COMPANY_ROLES } from '@/lib/admin';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}
interface CreateResult { email: string; emailSent: boolean; inviteUrl?: string }

const STATUS_CLS: Record<Invitation['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-600',
};
const roleLabel = (r: string) => r.replace(/_/g, ' ');

function InviteModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const L = useLabel();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('viewer');
  const [result, setResult] = useState<CreateResult | null>(null);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) { setEmail(''); setRole('viewer'); setResult(null); }
  };

  const invite = useMutation({
    mutationFn: async () => (await api.post<CreateResult>('/invitations', { email, role })).data,
    onSuccess: (r) => {
      setResult(r);
      void qc.invalidateQueries({ queryKey: ['invitations'] });
      toast.success(r.emailSent ? L('Invitation emailed', 'تم إرسال الدعوة') : L('Invitation created', 'تم إنشاء الدعوة'));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = (e: FormEvent) => { e.preventDefault(); invite.mutate(); };

  return (
    <Modal open={open} onOpenChange={close} title={L('Invite user', 'دعوة مستخدم')}>
      {result ? (
        <div className="space-y-4">
          {result.emailSent ? (
            <p className="text-sm">{L('An invitation email was sent to', 'تم إرسال دعوة إلى')} <b dir="ltr">{result.email}</b>.</p>
          ) : (
            <>
              <p className="text-sm text-secondary">
                {L('Email delivery is not configured. Share this link with the invitee (valid for 7 days, shown only once):', 'لم يتم إعداد البريد. شارك هذا الرابط مع المدعو (صالح 7 أيام، يظهر مرة واحدة):')}
              </p>
              <input readOnly dir="ltr" className={`${inputCls} font-mono text-xs`} value={result.inviteUrl ?? ''} onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className={btnCls}
                onClick={() => { void navigator.clipboard?.writeText(result.inviteUrl ?? ''); toast.success(L('Link copied', 'تم نسخ الرابط')); }}
              >
                {L('Copy link', 'نسخ الرابط')}
              </button>
            </>
          )}
          <div className="flex justify-end">
            <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={() => close(false)}>{L('Done', 'تم')}</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label={L('Email', 'البريد الإلكتروني')}>
            <input required type="email" dir="ltr" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label={L('Role', 'الدور')}>
            <select className={`${inputCls} capitalize`} value={role} onChange={(e) => setRole(e.target.value)}>
              {COMPANY_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={() => close(false)}>{L('Cancel', 'إلغاء')}</button>
            <button type="submit" disabled={invite.isPending} className={btnCls}>{L('Send invitation', 'إرسال الدعوة')}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function TeamPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const q = useQuery({ queryKey: ['invitations'], queryFn: async () => (await api.get<Invitation[]>('/invitations')).data });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => { toast.success(L('Invitation revoked', 'تم إلغاء الدعوة')); void qc.invalidateQueries({ queryKey: ['invitations'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{L('Team', 'الفريق')}</h1>
        <button type="button" className={`${btnCls} inline-flex items-center gap-2`} onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />{L('Invite User', 'دعوة مستخدم')}
        </button>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={thCls}>{L('Email', 'البريد')}</th>
              <th className={thCls}>{L('Role', 'الدور')}</th>
              <th className={thCls}>{L('Status', 'الحالة')}</th>
              <th className={thCls}>{L('Invited', 'تاريخ الدعوة')}</th>
              <th className={thCls}>{L('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{L('Loading…', 'جارٍ التحميل…')}</td></tr>}
            {q.isError && <tr><td colSpan={5} className="px-4 py-8 text-center text-red-600">{errMsg(q.error)}</td></tr>}
            {q.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">{L('No invitations yet', 'لا توجد دعوات بعد')}</td></tr>}
            {q.data?.map((i) => (
              <tr key={i.id} className={trCls}>
                <td className="px-4 py-3" dir="ltr">{i.email}</td>
                <td className="px-4 py-3 capitalize">{roleLabel(i.role)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[i.status]}`}>
                    {i.status === 'pending' ? L('Pending', 'قيد الانتظار') : i.status === 'accepted' ? L('Accepted', 'مقبولة') : L('Expired', 'منتهية')}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(i.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {i.status !== 'accepted' && (
                    <button
                      type="button"
                      disabled={revoke.isPending}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      onClick={() => { if (window.confirm(L('Revoke this invitation?', 'إلغاء هذه الدعوة؟'))) revoke.mutate(i.id); }}
                    >
                      {L('Revoke', 'إلغاء')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
