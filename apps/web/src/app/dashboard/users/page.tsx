'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { inviteUserSchema, UserRole } from '@ddotsinvoice/shared';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { Field, Modal, btnCls, cardCls, inputCls } from '@/components/ui';

type InviteForm = z.infer<typeof inviteUserSchema>;
interface UserRow { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean }
interface Paged<T> { items: T[]; total: number }

export default function UsersPage() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<Paged<UserRow>>('/users', { params: { limit: 100 } })).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteUserSchema), defaultValues: { role: UserRole.VIEWER } });

  const invite = useMutation({
    mutationFn: async (v: InviteForm) => (await api.post('/users', v)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      reset();
      setOpen(false);
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('users.title')}</h1>
        <button type="button" className={btnCls} onClick={() => setOpen(true)}>
          {t('users.invite')}
        </button>
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{t('common.name')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('common.email')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('common.role')}</th>
              <th className="px-4 py-3 text-start font-medium">{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((u) => (
              <tr key={u.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3">{`${u.firstName} ${u.lastName}`}</td>
                <td className="px-4 py-3" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">{t(`roles.${u.role}`)}</td>
                <td className="px-4 py-3">{u.isActive ? t('common.active') : t('common.inactive')}</td>
              </tr>
            ))}
            {!list.isLoading && !list.data?.items.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t('common.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onOpenChange={setOpen} title={t('users.invite')}>
        <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="space-y-3" noValidate>
          <Field label={t('common.firstName')} error={errors.firstName?.message}>
            <input className={inputCls} {...register('firstName')} />
          </Field>
          <Field label={t('common.lastName')} error={errors.lastName?.message}>
            <input className={inputCls} {...register('lastName')} />
          </Field>
          <Field label={t('common.email')} error={errors.email?.message}>
            <input dir="ltr" type="email" className={inputCls} {...register('email')} />
          </Field>
          <Field label={t('common.role')} error={errors.role?.message}>
            <select className={inputCls} {...register('role')}>
              {Object.values(UserRole)
                .filter((r) => r !== UserRole.PLATFORM_ADMIN)
                .map((r) => (
                  <option key={r} value={r}>{t(`roles.${r}`)}</option>
                ))}
            </select>
          </Field>
          {invite.isError && <p className="text-sm text-red-600">{t('common.error')}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-md px-4 py-2 text-sm" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={isSubmitting} className={btnCls}>
              {t('users.invite')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
