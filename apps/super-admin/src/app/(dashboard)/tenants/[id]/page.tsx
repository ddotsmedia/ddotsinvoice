'use client';

import { use, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { Badge, btnCls, cardCls, ghostBtnCls, Notice, PageHeader, SecretBox, tdCls, thCls } from '@/components/ui';

interface Detail {
  tenant: { id: string; name: string; email: string | null; plan: string; status: string };
  companies: { id: string; name: string; trn: string | null; isActive: boolean }[];
  users: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean }[];
  usage: { invoices: number; purchaseOrders: number; payrollRuns: number };
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);

  const q = useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => (await api.get<Detail>(`/super-admin/tenants/${id}`)).data,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ['tenant', id] });
  const onErr = (e: unknown) => setError(apiError(e));

  const suspend = useMutation({
    mutationFn: (op: 'suspend' | 'activate') => api.patch(`/super-admin/tenants/${id}/${op}`),
    onSuccess: refresh,
    onError: onErr,
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => api.patch<{ tempPassword: string }>(`/super-admin/users/${userId}/reset-password`),
    onSuccess: (r, userId) => {
      const u = q.data?.users.find((x) => x.id === userId);
      setSecret({ label: `Temporary password for ${u?.email ?? 'user'}`, value: r.data.tempPassword });
    },
    onError: onErr,
  });

  const impersonate = useMutation({
    mutationFn: async () => (await api.post<{ accessToken: string; expiresIn: number }>(`/super-admin/tenants/${id}/impersonate`)).data,
    onSuccess: (r) => setSecret({ label: `Impersonation token (expires in ${Math.round(r.expiresIn / 60)} min)`, value: r.accessToken }),
    onError: onErr,
  });

  if (q.isError) return <Notice kind="error">Could not load tenant.</Notice>;
  if (!q.data) return <p className="text-sm text-secondary">Loading…</p>;
  const { tenant, companies, users, usage } = q.data;
  const admin = users.find((u) => u.role === 'tenant_admin');

  return (
    <>
      <PageHeader
        title={tenant.name}
        subtitle={tenant.email ?? 'No contact email'}
        actions={
          <div className="flex flex-wrap gap-2">
            {tenant.status === 'suspended'
              ? <button className={btnCls} onClick={() => suspend.mutate('activate')}>Activate Tenant</button>
              : <button className={`${btnCls} bg-amber-500 hover:bg-amber-600`} onClick={() => suspend.mutate('suspend')}>Suspend Tenant</button>}
            <button className={ghostBtnCls} disabled={!admin || resetPassword.isPending} onClick={() => admin && resetPassword.mutate(admin.id)}>
              Reset Password
            </button>
            <button className={ghostBtnCls} disabled={impersonate.isPending} onClick={() => impersonate.mutate()}>Impersonate</button>
          </div>
        }
      />
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      {secret && <SecretBox label={secret.label} value={secret.value} onClose={() => setSecret(null)} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className={`${cardCls} p-5`}>
          <div className="text-sm text-secondary">Status</div>
          <div className="mt-2"><Badge value={tenant.status} /></div>
        </div>
        <div className={`${cardCls} p-5`}><div className="text-sm text-secondary">Plan</div><div className="mt-2 font-semibold capitalize text-primary">{tenant.plan}</div></div>
        <div className={`${cardCls} p-5`}><div className="text-sm text-secondary">Invoices / POs</div><div className="mt-2 font-mono font-semibold text-primary">{usage.invoices} / {usage.purchaseOrders}</div></div>
        <div className={`${cardCls} p-5`}><div className="text-sm text-secondary">Payroll runs</div><div className="mt-2 font-mono font-semibold text-primary">{usage.payrollRuns}</div></div>
      </div>

      <div className={`${cardCls} mt-6 overflow-x-auto`}>
        <h2 className="px-4 py-3 font-semibold text-primary">Companies ({companies.length})</h2>
        <table className="w-full">
          <thead className="border-y border-border bg-surface-2"><tr><th className={thCls}>Name</th><th className={thCls}>TRN</th><th className={thCls}>Active</th></tr></thead>
          <tbody className="divide-y divide-border">
            {companies.map((c) => (
              <tr key={c.id}><td className={tdCls}>{c.name}</td><td className={`${tdCls} font-mono`}>{c.trn ?? '—'}</td><td className={tdCls}><Badge value={c.isActive ? 'active' : 'inactive'} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${cardCls} mt-6 overflow-x-auto`}>
        <h2 className="px-4 py-3 font-semibold text-primary">Users ({users.length})</h2>
        <table className="w-full">
          <thead className="border-y border-border bg-surface-2"><tr><th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Role</th><th className={thCls}>Status</th></tr></thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className={tdCls}>{u.firstName} {u.lastName}</td><td className={tdCls}>{u.email}</td>
                <td className={`${tdCls} capitalize`}>{u.role.replace(/_/g, ' ')}</td>
                <td className={tdCls}><Badge value={u.isActive ? 'active' : 'inactive'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
