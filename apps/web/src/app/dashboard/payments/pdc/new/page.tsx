'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, btnOutlineCls, cardCls, inputCls, labelCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Customer { id: string; name: string }
interface Supplier { id: string; name: string }

export default function NewPdcPage() {
  const L = useLabel();
  const router = useRouter();
  const [form, setForm] = useState({
    type: 'received',
    chequeNumber: '',
    bankName: '',
    amount: '',
    currency: 'AED',
    dueDate: '',
    customerId: '',
    supplierId: '',
    reference: '',
    notes: '',
  });
  const [err, setErr] = useState('');

  const customers = useQuery<Customer[]>({
    queryKey: ['customers-list'],
    queryFn: async () => (await api.get('/customers?limit=200')).data,
  });
  const suppliers = useQuery<Supplier[]>({
    queryKey: ['suppliers-list'],
    queryFn: async () => (await api.get('/suppliers?limit=200')).data,
  });

  const save = useMutation({
    mutationFn: (data: typeof form) => api.post('/pdc', {
      ...data,
      amount: Number(data.amount),
      customerId: data.customerId || undefined,
      supplierId: data.supplierId || undefined,
    }),
    onSuccess: () => router.push('/dashboard/payments/pdc'),
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error saving'),
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isReceived = form.type === 'received';

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">{L('New PDC Cheque', 'شيك آجل جديد')}</h1>

      <div className={`${cardCls} space-y-5 p-6`}>
        {/* Type toggle */}
        <div>
          <label className={labelCls}>{L('Type', 'النوع')} *</label>
          <div className="mt-1 flex gap-2">
            {(['received', 'issued'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${form.type === t ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'border-border bg-card text-muted'}`}
              >
                {t === 'received' ? L('Received (Customer)', 'مستلم (عميل)') : L('Issued (Supplier)', 'صادر (مورد)')}
              </button>
            ))}
          </div>
        </div>

        {/* Party */}
        {isReceived ? (
          <div>
            <label className={labelCls}>{L('Customer', 'العميل')}</label>
            <select className={inputCls} value={form.customerId} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">{L('— Select customer —', '— اختر العميل —')}</option>
              {customers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelCls}>{L('Supplier', 'المورد')}</label>
            <select className={inputCls} value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)}>
              <option value="">{L('— Select supplier —', '— اختر المورد —')}</option>
              {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Cheque details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Cheque Number', 'رقم الشيك')} *</label>
            <input className={inputCls} dir="ltr" value={form.chequeNumber} onChange={(e) => set('chequeNumber', e.target.value)} placeholder="123456" />
          </div>
          <div>
            <label className={labelCls}>{L('Bank Name', 'اسم البنك')}</label>
            <input className={inputCls} value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="Emirates NBD" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{L('Amount', 'المبلغ')} *</label>
            <input type="number" min="0.01" step="0.01" className={inputCls} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="10000" />
          </div>
          <div>
            <label className={labelCls}>{L('Currency', 'العملة')}</label>
            <select className={inputCls} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              {['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>{L('Due Date', 'تاريخ الاستحقاق')} *</label>
          <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>{L('Reference', 'المرجع')}</label>
          <input className={inputCls} value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder={L('Invoice or PO reference', 'رقم الفاتورة أو أمر الشراء')} />
        </div>

        <div>
          <label className={labelCls}>{L('Notes', 'الملاحظات')}</label>
          <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {err && <p className="text-sm text-red-500">{err}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" className={btnOutlineCls} onClick={() => router.back()}>{L('Cancel', 'إلغاء')}</button>
          <button
            type="button"
            className={btnCls}
            disabled={!form.chequeNumber || !form.amount || !form.dueDate || save.isPending}
            onClick={() => save.mutate(form)}
          >
            {save.isPending ? L('Saving…', 'جاري الحفظ…') : L('Save Cheque', 'حفظ الشيك')}
          </button>
        </div>
      </div>
    </div>
  );
}
