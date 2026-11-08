'use client';

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Badge, btnCls, cardCls, ghostBtnCls, inputCls, Notice, PageHeader, Pager, tdCls, thCls } from '@/components/ui';

interface Tenant {
  id: string; name: string; plan: string; status: 'active' | 'suspended' | 'trial'; createdAt: string; companyCount: number; userCount: number;
}
interface Page<T> { items: T[]; total: number; page: number; limit: number }

const LIMIT = 20;

export default function TenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['tenants', page, query],
    queryFn: async () => (await api.get<Page<Tenant>>('/super-admin/tenants', { params: { page, limit: LIMIT, search: query || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: async ({ id, op }: { id: string; op: 'suspend' | 'activate' | 'delete' }) => {
      if (op === 'delete') return api.delete(`/super-admin/tenants/${id}`);
      return api.patch(`/super-admin/tenants/${id}/${op}`);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tenants'] }),
    onError: (e) => setError(apiError(e)),
  });

  const onDelete = (t: Tenant) => {
    if (window.confirm(`Soft-delete tenant "${t.name}"? Its users will no longer be able to sign in.`)) act.mutate({ id: t.id, op: 'delete' });
  };

  return (
    <>
      <PageHeader title="Tenants" subtitle="All customer tenants on the platform" />
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
        <input className={`${inputCls} max-w-sm`} placeholder="Search tenants…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={btnCls} type="submit">Search</button>
      </form>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[800px]">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th className={thCls}>Name</th><th className={thCls}>Plan</th><th className={thCls}>Status</th>
              <th className={thCls}>Created</th><th className={`${thCls} text-end`}>Companies</th><th className={`${thCls} text-end`}>Users</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-secondary">Loading…</td></tr>}
            {list.data?.items.map((t) => (
              <tr key={t.id} className="hover:bg-surface-2">
                <td className={`${tdCls} font-medium`}>{t.name}<div className="font-mono text-[11px] text-muted">{t.id}</div></td>
                <td className={`${tdCls} capitalize`}>{t.plan}</td>
                <td className={tdCls}><Badge value={t.status} /></td>
                <td className={tdCls}>{fmtDate(t.createdAt)}</td>
                <td className={`${tdCls} text-end font-mono`}>{t.companyCount}</td>
                <td className={`${tdCls} text-end font-mono`}>{t.userCount}</td>
                <td className={tdCls}>
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={`/tenants/${t.id}`} className={ghostBtnCls}>View</Link>
                    {t.status === 'suspended'
                      ? <button className={ghostBtnCls} onClick={() => act.mutate({ id: t.id, op: 'activate' })}>Activate</button>
                      : <button className={ghostBtnCls} onClick={() => act.mutate({ id: t.id, op: 'suspend' })}>Suspend</button>}
                    <button className={`${ghostBtnCls} text-red-600`} onClick={() => onDelete(t)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.data && !list.data.items.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-secondary">No tenants found</td></tr>}
          </tbody>
        </table>
        {list.data && <Pager page={page} limit={LIMIT} total={list.data.total} onChange={setPage} />}
      </div>
    </>
  );
}
