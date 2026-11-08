'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { btnCls, cardCls, thCls, trCls } from '@/components/ui';
import { useLabel, errMsg } from '@/lib/ui-helpers';
import { EDITABLE_PERMISSION_ROLES } from '@/lib/admin';

interface Perm { code: string; module: string; action: string; description: string }
interface RolesData { catalog: Perm[]; roles: string[]; editableRoles: readonly string[]; matrix: Record<string, string[]> }

export default function AdminRolesPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-roles'], queryFn: async () => (await api.get<RolesData>('/admin/roles')).data });
  // draft[role] = permission codes currently ticked in the UI for editable roles
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!q.data) return;
    setDraft(Object.fromEntries(Object.entries(q.data.matrix).map(([r, codes]) => [r, new Set(codes)])));
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (role: string) =>
      (await api.patch<RolesData>('/admin/roles', { role, permissions: [...(draft[role] ?? [])] })).data,
    onSuccess: (_d, role) => {
      toast.success(L(`Saved ${role.replace(/_/g, ' ')}`, 'تم الحفظ'));
      void qc.invalidateQueries({ queryKey: ['admin-roles'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const toggle = (role: string, code: string) =>
    setDraft((d) => {
      const next = new Set(d[role] ?? []);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return { ...d, [role]: next };
    });

  const editable = (role: string) => (EDITABLE_PERMISSION_ROLES as readonly string[]).includes(role);

  return (
    <div className="mx-auto max-w-full space-y-4">
      <h1 className="text-2xl font-bold text-primary">{L('Roles & Permissions', 'الأدوار والصلاحيات')}</h1>
      <p className="text-sm text-secondary">
        {L(
          'Changes apply only to this company. Roles marked editable can be customised; others are fixed.',
          'التغييرات تطبق على هذه الشركة فقط.',
        )}
      </p>

      {q.data && (
        <div className={`${cardCls} overflow-x-auto`}>
          <table className="min-w-max text-xs">
            <thead>
              <tr>
                <th className={`${thCls} sticky start-0 z-10 min-w-56`}>{L('Permission', 'الصلاحية')}</th>
                {q.data.roles.map((r) => (
                  <th key={r} className={`${thCls} text-center`}>{r.replace(/_/g, ' ')}</th>
                ))}
              </tr>
              <tr>
                <td className="sticky start-0 bg-white px-4 py-2 dark:bg-slate-900" />
                {q.data.roles.map((r) => (
                  <td key={r} className="px-2 py-2 text-center">
                    {editable(r) ? (
                      <button type="button" className={`${btnCls} px-2 py-1 text-xs`} onClick={() => save.mutate(r)} disabled={save.isPending}>
                        {L('Save', 'حفظ')}
                      </button>
                    ) : (
                      <span className="text-muted">{L('fixed', 'ثابت')}</span>
                    )}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.data.catalog.map((p) => (
                <tr key={p.code} className={trCls}>
                  <td className="sticky start-0 bg-white px-4 py-2 font-mono text-primary dark:bg-slate-900">{p.code}</td>
                  {q.data!.roles.map((r) => {
                    const checked = draft[r]?.has(p.code) ?? false;
                    return (
                      <td key={r} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${r} ${p.code}`}
                          className="h-4 w-4 accent-brand-500"
                          checked={checked}
                          disabled={!editable(r)}
                          onChange={() => toggle(r, p.code)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
