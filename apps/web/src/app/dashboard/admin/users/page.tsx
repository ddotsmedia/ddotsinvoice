'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { btnCls, cardCls, thCls, trCls, StatusBadge } from '@/components/ui';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { AdminUser, COMPANY_ROLES, fullName } from '@/lib/admin';

export default function AdminUsersPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get<AdminUser[]>('/admin/users')).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const role = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { toast.success(L('Role updated', 'تم تحديث الدور')); void refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const suspend = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) => api.patch(`/admin/users/${id}/suspend`, { suspended }),
    onSuccess: () => { toast.success(L('Status updated', 'تم تحديث الحالة')); void refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success(L('User deleted', 'تم حذف المستخدم')); void refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{L('User Management', 'إدارة المستخدمين')}</h1>
        <Link href="/dashboard/admin/users/invite" className={btnCls}>
          <UserPlus className="h-4 w-4" />
          {L('Invite user', 'دعوة مستخدم')}
        </Link>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={thCls}>{L('Name', 'الاسم')}</th>
              <th className={thCls}>{L('Email', 'البريد')}</th>
              <th className={thCls}>{L('Role', 'الدور')}</th>
              <th className={thCls}>{L('Status', 'الحالة')}</th>
              <th className={thCls}>{L('Last login', 'آخر دخول')}</th>
              <th className={thCls}>{L('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((u) => (
              <tr key={u.id} className={trCls}>
                <td className="px-4 py-3 font-medium text-primary">{fullName(u)}</td>
                <td className="px-4 py-3 text-secondary" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    aria-label="Role"
                    className="rounded-md border border-border bg-white px-2 py-1 text-sm dark:bg-slate-800"
                    value={u.role}
                    onChange={(e) => role.mutate({ id: u.id, role: e.target.value })}
                  >
                    {COMPANY_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3"><StatusBadge status={u.isActive ? 'active' : 'suspended'} /></td>
                <td className="px-4 py-3 font-mono text-xs text-muted" dir="ltr">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-brand-600 hover:underline"
                      onClick={() => suspend.mutate({ id: u.id, suspended: u.isActive })}
                    >
                      {u.isActive ? L('Suspend', 'إيقاف') : L('Activate', 'تفعيل')}
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => window.confirm(L('Delete this user?', 'حذف هذا المستخدم؟')) && remove.mutate(u.id)}
                    >
                      {L('Delete', 'حذف')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {q.data && !q.data.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">{L('No users', 'لا يوجد مستخدمون')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
