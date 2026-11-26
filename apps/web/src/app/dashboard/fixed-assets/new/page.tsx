'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, btnOutlineCls, cardCls, inputCls, labelCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

const CATEGORIES = ['Building', 'Vehicle', 'Equipment', 'Computer', 'Furniture', 'Machinery', 'Other'];
const METHODS = [
  { value: 'straight_line', en: 'Straight Line', ar: 'القسط الثابت' },
  { value: 'declining_balance', en: 'Declining Balance', ar: 'القسط المتناقص' },
];

export default function NewFixedAssetPage() {
  const L = useLabel();
  const router = useRouter();
  const [form, setForm] = useState({
    code: '', name: '', nameAr: '', category: 'Equipment',
    description: '', acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: '', residualValue: '0',
    usefulLifeMonths: '60', depreciationMethod: 'straight_line',
    location: '', serialNumber: '',
  });
  const [err, setErr] = useState('');

  const save = useMutation({
    mutationFn: (data: typeof form) => api.post('/fixed-assets', {
      ...data,
      acquisitionCost: Number(data.acquisitionCost),
      residualValue: Number(data.residualValue),
      usefulLifeMonths: Number(data.usefulLifeMonths),
    }),
    onSuccess: (res) => router.push(`/dashboard/fixed-assets/${res.data.id}`),
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error saving'),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const usefulYears = Math.round(Number(form.usefulLifeMonths) / 12 * 10) / 10;
  const monthlyDep = form.acquisitionCost && form.usefulLifeMonths
    ? ((Number(form.acquisitionCost) - Number(form.residualValue)) / Number(form.usefulLifeMonths)).toFixed(2)
    : '—';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">{L('New Fixed Asset', 'أصل ثابت جديد')}</h1>

      <div className={`${cardCls} space-y-5 p-6`}>
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Asset Code', 'رمز الأصل')} *</label>
            <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="FA-001" />
          </div>
          <div>
            <label className={labelCls}>{L('Category', 'الفئة')}</label>
            <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Name (English)', 'الاسم (إنجليزي)')} *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dell Laptop" />
          </div>
          <div>
            <label className={labelCls}>{L('Name (Arabic)', 'الاسم (عربي)')}</label>
            <input className={inputCls} dir="rtl" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} placeholder="لابتوب ديل" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Location', 'الموقع')}</label>
            <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="HQ / Dubai" />
          </div>
          <div>
            <label className={labelCls}>{L('Serial Number', 'الرقم التسلسلي')}</label>
            <input className={inputCls} value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
          </div>
        </div>

        {/* Acquisition */}
        <hr className="border-border" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{L('Acquisition', 'الاقتناء')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Acquisition Date', 'تاريخ الاقتناء')} *</label>
            <input type="date" className={inputCls} value={form.acquisitionDate} onChange={(e) => set('acquisitionDate', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{L('Acquisition Cost (AED)', 'تكلفة الاقتناء')} *</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.acquisitionCost} onChange={(e) => set('acquisitionCost', e.target.value)} placeholder="50000" />
          </div>
        </div>

        {/* Depreciation */}
        <hr className="border-border" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{L('Depreciation', 'الاستهلاك')}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{L('Method', 'الطريقة')}</label>
            <select className={inputCls} value={form.depreciationMethod} onChange={(e) => set('depreciationMethod', e.target.value)}>
              {METHODS.map((m) => <option key={m.value} value={m.value}>{L(m.en, m.ar)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{L('Useful Life (months)', 'العمر الإنتاجي (شهر)')}</label>
            <input type="number" min="1" className={inputCls} value={form.usefulLifeMonths} onChange={(e) => set('usefulLifeMonths', e.target.value)} />
            <p className="mt-1 text-xs text-muted">{usefulYears} {L('years', 'سنة')}</p>
          </div>
          <div>
            <label className={labelCls}>{L('Residual Value (AED)', 'القيمة المتبقية')}</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.residualValue} onChange={(e) => set('residualValue', e.target.value)} />
          </div>
        </div>

        {/* Preview */}
        {form.acquisitionCost && (
          <div className="rounded-lg bg-brand-50 p-4 dark:bg-brand-900/20">
            <p className="text-sm text-brand-700 dark:text-brand-300">
              {L('Monthly depreciation', 'الاستهلاك الشهري')}: <strong>AED {monthlyDep}</strong>
            </p>
          </div>
        )}

        {err && <p className="text-sm text-red-500">{err}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className={btnOutlineCls} onClick={() => router.back()}>{L('Cancel', 'إلغاء')}</button>
          <button
            type="button"
            className={btnCls}
            disabled={!form.code || !form.name || !form.acquisitionDate || !form.acquisitionCost || save.isPending}
            onClick={() => save.mutate(form)}
          >
            {save.isPending ? L('Saving…', 'جاري الحفظ…') : L('Save Asset', 'حفظ الأصل')}
          </button>
        </div>
      </div>
    </div>
  );
}
