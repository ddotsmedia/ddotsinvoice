'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { btnCls, cardCls, Field, inputCls, sectionCls } from '@/components/ui';
import { useLabel, errMsg } from '@/lib/ui-helpers';

interface Company {
  id: string;
  name: string;
  nameAr: string | null;
  trn: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressAr: string | null;
  logoUrl: string | null;
  fiscalYearStart: string;
  settings: { defaultPaymentTerms?: number; defaultVatRate?: number; invoicePrefix?: string } | null;
}

interface Form {
  name: string; nameAr: string; trn: string; email: string; phone: string; address: string; addressAr: string; logoUrl: string;
  fiscalYearStartMonth: string; defaultPaymentTerms: string; defaultVatRate: string; invoicePrefix: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AdminCompanyPage() {
  const L = useLabel();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-company'], queryFn: async () => (await api.get<Company>('/admin/company')).data });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    const c = q.data;
    if (!c) return;
    setForm({
      name: c.name ?? '', nameAr: c.nameAr ?? '', trn: c.trn ?? '', email: c.email ?? '', phone: c.phone ?? '',
      address: c.address ?? '', addressAr: c.addressAr ?? '', logoUrl: c.logoUrl ?? '',
      fiscalYearStartMonth: String(Number(c.fiscalYearStart?.slice(0, 2)) || 1),
      defaultPaymentTerms: String(c.settings?.defaultPaymentTerms ?? 30),
      defaultVatRate: String(c.settings?.defaultVatRate ?? 5),
      invoicePrefix: c.settings?.invoicePrefix ?? 'INV',
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const body: Record<string, unknown> = {
        name: f.name,
        nameAr: f.nameAr,
        trn: f.trn,
        phone: f.phone,
        address: f.address,
        addressAr: f.addressAr,
        logoUrl: f.logoUrl,
        fiscalYearStartMonth: Number(f.fiscalYearStartMonth),
        defaultPaymentTerms: Number(f.defaultPaymentTerms),
        defaultVatRate: Number(f.defaultVatRate),
        invoicePrefix: f.invoicePrefix.toUpperCase(),
      };
      if (f.email) body.email = f.email;
      return (await api.patch(`/admin/company/${q.data!.id}`, body)).data;
    },
    onSuccess: () => {
      toast.success(L('Company saved', 'تم حفظ الشركة'));
      void qc.invalidateQueries({ queryKey: ['admin-company'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (!form) return <div className="p-6 text-sm text-muted">{L('Loading…', 'جارٍ التحميل…')}</div>;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-primary">{L('Company Settings', 'إعدادات الشركة')}</h1>
      <form onSubmit={submit} className={`${cardCls} space-y-6 p-6`}>
        <section className="grid gap-4 md:grid-cols-2">
          <h2 className={`${sectionCls} md:col-span-2`}>{L('Identity', 'الهوية')}</h2>
          <Field label={L('Company name (EN)', 'اسم الشركة (EN)')}><input required className={inputCls} value={form.name} onChange={set('name')} /></Field>
          <Field label={L('Company name (AR)', 'اسم الشركة (AR)')}><input dir="rtl" className={inputCls} value={form.nameAr} onChange={set('nameAr')} /></Field>
          <Field label={L('TRN (15 digits)', 'الرقم الضريبي')}><input dir="ltr" className={inputCls} value={form.trn} onChange={set('trn')} /></Field>
          <Field label={L('Logo URL', 'رابط الشعار')}><input dir="ltr" className={inputCls} value={form.logoUrl} onChange={set('logoUrl')} /></Field>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <h2 className={`${sectionCls} md:col-span-2`}>{L('Contact & address', 'التواصل والعنوان')}</h2>
          <Field label={L('Email', 'البريد')}><input type="email" dir="ltr" className={inputCls} value={form.email} onChange={set('email')} /></Field>
          <Field label={L('Phone', 'الهاتف')}><input dir="ltr" className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
          <Field label={L('Address (EN)', 'العنوان (EN)')}><input className={inputCls} value={form.address} onChange={set('address')} /></Field>
          <Field label={L('Address (AR)', 'العنوان (AR)')}><input dir="rtl" className={inputCls} value={form.addressAr} onChange={set('addressAr')} /></Field>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <h2 className={`${sectionCls} md:col-span-2`}>{L('Financial defaults', 'الإعدادات المالية')}</h2>
          <Field label={L('Financial year start', 'بداية السنة المالية')}>
            <select className={inputCls} value={form.fiscalYearStartMonth} onChange={set('fiscalYearStartMonth')}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label={L('Default payment terms (days)', 'شروط الدفع الافتراضية (أيام)')}>
            <input type="number" min={0} max={365} className={inputCls} value={form.defaultPaymentTerms} onChange={set('defaultPaymentTerms')} />
          </Field>
          <Field label={L('Default VAT rate (%)', 'نسبة الضريبة الافتراضية (%)')}>
            <input type="number" min={0} max={100} step="0.01" className={inputCls} value={form.defaultVatRate} onChange={set('defaultVatRate')} />
          </Field>
          <Field label={L('Invoice prefix', 'بادئة الفاتورة')}>
            <input dir="ltr" maxLength={10} className={`${inputCls} font-mono uppercase`} value={form.invoicePrefix} onChange={set('invoicePrefix')} />
          </Field>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={save.isPending} className={btnCls}>{L('Save changes', 'حفظ التغييرات')}</button>
        </div>
      </form>
    </div>
  );
}
