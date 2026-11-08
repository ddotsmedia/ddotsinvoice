'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Badge, cardCls, ghostBtnCls, Notice, PageHeader, Pager, tdCls, thCls } from '@/components/ui';

interface Company {
  id: string; name: string; tenantName: string; trn: string | null; country: string; isActive: boolean; createdAt: string;
}
interface Page<T> { items: T[]; total: number; page: number; limit: number }

const LIMIT = 20;

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['companies', page],
    queryFn: async () => (await api.get<Page<Company>>('/super-admin/companies', { params: { page, limit: LIMIT } })).data,
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (c: Company) => api.patch(`/super-admin/companies/${c.id}/suspend`, { suspended: c.isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['companies'] }),
    onError: (e) => setError(apiError(e)),
  });

  return (
    <>
      <PageHeader title="Companies" subtitle="Every company across all tenants" />
      {error && <Notice kind="error" onClose={() => setError(null)}>{error}</Notice>}
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-border bg-surface-2">
            <tr>
              <th className={thCls}>Company</th><th className={thCls}>Tenant</th><th className={thCls}>TRN</th>
              <th className={thCls}>Country</th><th className={thCls}>Status</th><th className={thCls}>Created</th><th className={thCls}>Quick toggle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-secondary">Loading…</td></tr>}
            {list.data?.items.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2">
                <td className={`${tdCls} font-medium`}>{c.name}</td>
                <td className={tdCls}>{c.tenantName}</td>
                <td className={`${tdCls} font-mono`}>{c.trn ?? '—'}</td>
                <td className={tdCls}>{c.country}</td>
                <td className={tdCls}><Badge value={c.isActive ? 'active' : 'suspended'} label={c.isActive ? 'Active' : 'Suspended'} /></td>
                <td className={tdCls}>{fmtDate(c.createdAt)}</td>
                <td className={tdCls}>
                  <button className={ghostBtnCls} disabled={toggle.isPending} onClick={() => toggle.mutate(c)}>
                    {c.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {list.data && !list.data.items.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-secondary">No companies</td></tr>}
          </tbody>
        </table>
        {list.data && <Pager page={page} limit={LIMIT} total={list.data.total} onChange={setPage} />}
      </div>
    </>
  );
}
