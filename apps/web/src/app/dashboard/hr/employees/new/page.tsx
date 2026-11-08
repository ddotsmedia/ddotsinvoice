'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, stripEmpty, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { Branch } from '@/lib/purchasing-types';

interface Form {
  nameEn: string; nameAr: string; jobTitle: string; hireDate: string; nationality?: string; nationalId?: string;
  departmentId?: string; branchId?: string; ibanNumber?: string; bankName?: string; routingCode?: string;
  basicSalary: string; housingAllowance?: string; transportAllowance?: string; otherAllowances?: string;
}
interface Dept { id: string; nameEn: string; nameAr: string }

export default function NewEmployeePage() {
  const L = useLabel();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { nationality: 'AE' } });
  const depts = useQuery({ queryKey: ['departments'], queryFn: async () => (await api.get<Paged<Dept>>('/hr/departments', { params: { limit: 100 } })).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const save = useMutation({
    mutationFn: async (v: Form) => {
      const { basicSalary, housingAllowance, transportAllowance, otherAllowances, ...emp } = v;
      const { data } = await api.post<{ id: string }>('/hr/employees', stripEmpty(emp));
      await api.post(`/hr/employees/${data.id}/salary-structure`, stripEmpty({
        effectiveDate: v.hireDate, basicSalary, housingAllowance, transportAllowance, otherAllowances,
      }));
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/hr/employees/${id}`),
  });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Employee', 'موظف جديد')}</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className={`${cardCls} grid max-w-3xl gap-4 p-6 sm:grid-cols-2`} noValidate>
        <Field label={L('Name (English)', 'الاسم (إنجليزي)')} error={errors.nameEn?.message}><input className={inputCls} {...register('nameEn', { required: true })} /></Field>
        <Field label={L('Name (Arabic)', 'الاسم (عربي)')} error={errors.nameAr?.message}><input className={inputCls} {...register('nameAr', { required: true })} /></Field>
        <Field label={L('Job title', 'المسمى الوظيفي')}><input className={inputCls} {...register('jobTitle', { required: true })} /></Field>
        <Field label={L('Hire date', 'تاريخ التعيين')}><input type="date" dir="ltr" className={inputCls} {...register('hireDate', { required: true })} /></Field>
        <Field label={L('Nationality (ISO)', 'الجنسية')}><input dir="ltr" className={inputCls} {...register('nationality')} /></Field>
        <Field label={L('Emirates / national ID', 'الهوية')}><input dir="ltr" className={inputCls} {...register('nationalId')} /></Field>
        <Field label={L('Department', 'القسم')}>
          <select className={inputCls} {...register('departmentId')}>
            <option value="">—</option>
            {depts.data?.items.map((d) => <option key={d.id} value={d.id}>{L(d.nameEn, d.nameAr)}</option>)}
          </select>
        </Field>
        <Field label={L('Branch', 'الفرع')}>
          <select className={inputCls} {...register('branchId')}>
            <option value="">—</option>
            {branches.data?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="IBAN"><input dir="ltr" className={inputCls} {...register('ibanNumber')} /></Field>
        <Field label={L('Bank name', 'اسم البنك')}><input className={inputCls} {...register('bankName')} /></Field>
        <Field label={L('WPS routing code', 'رمز التوجيه')}><input dir="ltr" className={inputCls} {...register('routingCode')} /></Field>
        <div className="sm:col-span-2 font-semibold">{L('Salary structure (AED)', 'هيكل الراتب (درهم)')}</div>
        <Field label={L('Basic salary', 'الراتب الأساسي')} error={errors.basicSalary?.message}><input dir="ltr" className={`${inputCls} text-end`} {...register('basicSalary', { required: true })} /></Field>
        <Field label={L('Housing', 'بدل السكن')}><input dir="ltr" className={`${inputCls} text-end`} {...register('housingAllowance')} /></Field>
        <Field label={L('Transport', 'بدل النقل')}><input dir="ltr" className={`${inputCls} text-end`} {...register('transportAllowance')} /></Field>
        <Field label={L('Other', 'بدلات أخرى')}><input dir="ltr" className={`${inputCls} text-end`} {...register('otherAllowances')} /></Field>
        {save.isError && <p className="text-sm text-red-600 sm:col-span-2">{errMsg(save.error)}</p>}
        <div className="flex justify-end sm:col-span-2"><button type="submit" className={btnCls}>{L('Save', 'حفظ')}</button></div>
      </form>
    </div>
  );
}
