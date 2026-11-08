'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { fmtDateTime, ROLES } from '@/lib/format';
import { Badge, btnCls, cardCls, ghostBtnCls, inputCls, Notice, PageHeader, Pager, SecretBox, tdCls, thCls } from '@/components/ui';

interface User {
  id: string; firstName: string; lastName: string; email: string; role: string;
  tenantName: string | null; companyName: string | null; lastLoginAt: string | null; isActive: boolean;
}
interface Page<T> { items: T[]; total: number; page: number; limit: number }

const LIMIT = 20;

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);

  const list = useQuery({
    queryKey: ['users', page, query],
    queryFn: async () => (await api.get<Page<User>>('/super-admin/users', { params: { page, limit: LIMIT, search: query || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  const done = () => void qc.invalidateQueries({ queryKey: ['users'] });
  const onErr = (e: unknown) => setError(apiError(e));

  const resetPw = useMutation({
    mutationFn: (u: User) => api.patch<{ tempPassword: string }>(`/super-admin/users/${u.id}/reset-password`),
    onSuccess: (r, u) => setSecret({ label: `Temporary password for ${u.email}`, value: r.data.tempPassword }),
    onError: onErr,
  });
  const suspend = useMutation({
    mutationFn: (u: User) => api.patch(`/super-admin/users/${u.id}/suspend`, { suspended: u.isActive }),
    onSuccess: done,
    onError: onErr,
  });
  const changeRole = useMutation({
    mutationFn: ({ u, role }: { u: User; role: string }) => api.patch(`/super-admin/users/${u.id}/role`, { role }),
    onSuccess: done,
    onError: onErr,
  });

  return (
    <>
      <PageHeader title="Users" subtitle="All user accounts on the platform" />
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      {secret && <SecretBox label={secret.label} value={secret.value} onClose={() => setSecret(null)} />}
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
        <input className={`${inputCls} max-w-sm`} placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={btnCls} type="submit">Search</button>
      </form>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[1000px]">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th className={thCls}>Name</th><th className={thCls}>Email</th><th className={thCls}>Role</th><th className={thCls}>Tenant</th>
              <th className={thCls}>Company</th><th className={thCls}>Last login</th><th className={thCls}>Status</th><th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-secondary">Loading…</td></tr>}
            {list.data?.items.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2">
                <td className={`${tdCls} font-medium`}>{u.firstName} {u.lastName}</td>
                <td className={tdCls}>{u.email}</td>
                <td className={tdCls}>
                  <select
                    className="h-8 rounded-md border border-border bg-surface px-2 text-xs capitalize"
                    value={u.role}
                    disabled={changeRole.isPending}
                    onChange={(e) => changeRole.mutate({ u, role: e.target.value })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className={tdCls}>{u.tenantName ?? '—'}</td>
                <td className={tdCls}>{u.companyName ?? '—'}</td>
                <td className={`${tdCls} whitespace-nowrap text-xs`}>{fmtDateTime(u.lastLoginAt)}</td>
                <td className={tdCls}><Badge value={u.isActive ? 'active' : 'suspended'} label={u.isActive ? 'Active' : 'Suspended'} /></td>
                <td className={tdCls}>
                  <div className="flex flex-wrap gap-1.5">
                    <button className={ghostBtnCls} disabled={resetPw.isPending} onClick={() => resetPw.mutate(u)}>Reset password</button>
                    <button className={ghostBtnCls} onClick={() => suspend.mutate(u)}>{u.isActive ? 'Suspend' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.data && !list.data.items.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-secondary">No users found</td></tr>}
          </tbody>
        </table>
        {list.data && <Pager page={page} limit={LIMIT} total={list.data.total} onChange={setPage} />}
      </div>
    </>
  );
}
