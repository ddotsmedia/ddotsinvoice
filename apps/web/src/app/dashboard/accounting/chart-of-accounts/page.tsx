'use client';

import { Fragment, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';
import type { AccountNode } from '@/lib/accounting-types';

const TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
interface AccountForm { code: string; name: string; type: string; parentId?: string; isHeader?: boolean }

const flatten = (nodes: AccountNode[]): AccountNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

export default function ChartOfAccountsPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountForm>({ defaultValues: { type: 'asset' } });

  const tree = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get<AccountNode[]>('/accounting/accounts')).data,
  });
  const all = flatten(tree.data ?? []);

  const create = useMutation({
    mutationFn: async (v: AccountForm) => (await api.post('/accounting/accounts', stripEmpty(v))).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['accounts'] });
      reset({ type: 'asset' });
      setOpen(false);
    },
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/accounts/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['accounts'] }),
  });

  const renderRows = (nodes: AccountNode[], depth: number): React.ReactNode =>
    nodes.map((n) => (
      <Fragment key={n.id}>
        <tr className={`border-t border-border dark:border-slate-800 ${n.isActive ? '' : 'opacity-50'}`}>
          <td className="px-4 py-2 font-mono" dir="ltr" style={{ paddingInlineStart: `${depth * 1.25 + 1}rem` }}>{n.code}</td>
          <td className={`px-4 py-2 ${n.isHeader ? 'font-semibold' : ''}`}>{n.name}</td>
          <td className="px-4 py-2">{n.type}</td>
          <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(n.balance).toFixed(2)}</td>
          <td className="px-4 py-2">
            {n.isActive && (
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => deactivate.mutate(n.id)}>
                {L('Deactivate', 'تعطيل')}
              </button>
            )}
          </td>
        </tr>
        {renderRows(n.children, depth + 1)}
      </Fragment>
    ));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Chart of Accounts', 'دليل الحسابات')}</h1>
        <button type="button" className={btnCls} onClick={() => setOpen(true)}>{L('Add Account', 'إضافة حساب')}</button>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Type', 'النوع')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Balance', 'الرصيد')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>{renderRows(tree.data ?? [], 0)}</tbody>
        </table>
        {deactivate.isError && <p className="p-3 text-sm text-red-600">{errMsg(deactivate.error)}</p>}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={L('Add Account', 'إضافة حساب')}>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
          <Field label={L('Code', 'الرمز')} error={errors.code?.message}>
            <input dir="ltr" className={inputCls} {...register('code', { required: true })} />
          </Field>
          <Field label={L('Name', 'الاسم')} error={errors.name?.message}>
            <input className={inputCls} {...register('name', { required: true })} />
          </Field>
          <Field label={L('Type', 'النوع')}>
            <select className={inputCls} {...register('type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label={L('Parent', 'الحساب الأب')}>
            <select className={inputCls} {...register('parentId')}>
              <option value="">—</option>
              {all.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('isHeader')} /> {L('Header account (cannot post)', 'حساب رئيسي (لا يقبل قيود)')}
          </label>
          {create.isError && <p className="text-sm text-red-600">{errMsg(create.error)}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-md px-4 py-2 text-sm" onClick={() => setOpen(false)}>{L('Cancel', 'إلغاء')}</button>
            <button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
