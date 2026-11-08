'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { FiscalYear } from '@/lib/accounting-types';

interface FyForm { name: string; startDate: string; endDate: string }

export default function FiscalYearsPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<FyForm>({
    defaultValues: { name: `FY ${new Date().getFullYear()}`, startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` },
  });

  const years = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: async () => (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data,
  });

  const create = useMutation({
    mutationFn: async (v: FyForm) => (await api.post('/accounting/fiscal-years', v)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['fiscal-years'] });
      setOpen(false);
      reset();
    },
  });
  const close = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/accounting/fiscal-years/${id}/close`)).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Fiscal Years', 'السنوات المالية')}</h1>
        <button type="button" className={btnCls} onClick={() => setOpen(true)}>{L('New Fiscal Year', 'سنة مالية جديدة')}</button>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Start', 'البداية')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('End', 'النهاية')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {years.data?.map((y) => (
              <tr key={y.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3">{y.name}</td>
                <td className="px-4 py-3" dir="ltr">{y.startDate}</td>
                <td className="px-4 py-3" dir="ltr">{y.endDate}</td>
                <td className="px-4 py-3">{y.status}</td>
                <td className="px-4 py-3">
                  {y.status === 'open' && (
                    <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => close.mutate(y.id)}>
                      {L('Close year', 'إقفال السنة')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {close.isError && <p className="p-3 text-sm text-red-600">{errMsg(close.error)}</p>}
      </div>

      <Modal open={open} onOpenChange={setOpen} title={L('New Fiscal Year', 'سنة مالية جديدة')}>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3" noValidate>
          <Field label={L('Name', 'الاسم')}><input className={inputCls} {...register('name', { required: true })} /></Field>
          <Field label={L('Start date', 'تاريخ البداية')}><input type="date" dir="ltr" className={inputCls} {...register('startDate', { required: true })} /></Field>
          <Field label={L('End date', 'تاريخ النهاية')}><input type="date" dir="ltr" className={inputCls} {...register('endDate', { required: true })} /></Field>
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
