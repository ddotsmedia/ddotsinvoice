'use client';

import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, money, mul, div, sub, toDb, type Money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';
import type { Customer } from '@/lib/invoicing-types';

type VatType = 'standard' | 'zero_rated' | 'exempt';
interface Line { description: string; quantity: string; unitPrice: string; discountPct: string; vatType: VatType }
const blank = (): Line => ({ description: '', quantity: '1', unitPrice: '', discountPct: '0', vatType: 'standard' });
const safe = (v: string): Money => { try { return money(v || '0'); } catch { return money(0); } };
const HUNDRED = money(100);
const VAT = money(5);

// Mirrors the server calc: line = qty*price - discount; VAT 5% on standard only
function calc(l: Line) {
  const gross = mul(safe(l.quantity), safe(l.unitPrice));
  const disc = mul(gross, div(safe(l.discountPct), HUNDRED));
  const sub_ = sub(gross, disc);
  const vat = l.vatType === 'standard' ? mul(sub_, div(VAT, HUNDRED)) : money(0);
  return { sub: sub_, vat };
}

function NewInvoiceInner() {
  const L = useLabel();
  const router = useRouter();
  const sp = useSearchParams();
  const type = sp.get('type') === 'quote' ? 'quote' : 'invoice';
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [terms, setTerms] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{
        customerName: string | null;
        invoiceNumber: string | null;
        date: string | null;
        lineItems: { description: string; qty: number; unitPrice: number }[];
        total: number | null;
      }>('/invoicing/invoices/extract', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.date) setDate(data.date.replace(/\//g, '-'));
      if (data.lineItems?.length) {
        setLines(data.lineItems.map((li) => ({ description: li.description, quantity: String(li.qty || 1), unitPrice: String(li.unitPrice || ''), discountPct: '0', vatType: 'standard' as const })));
      }
    } catch {
      // silent — user can fill manually
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const customers = useQuery({
    queryKey: ['customers', ''],
    queryFn: async () => (await api.get<Paged<Customer>>('/invoicing/customers', { params: { limit: 100, active: 'true' } })).data,
  });

  const subtotal = lines.reduce((a, l) => add(a, calc(l).sub), money(0));
  const vat = lines.reduce((a, l) => add(a, calc(l).vat), money(0));
  const total = add(subtotal, vat);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const body = {
        type,
        customerId,
        date,
        paymentTerms: terms === '' ? undefined : Number(terms),
        notes: notes || undefined,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct || '0',
          vatType: l.vatType,
        })),
        isRecurring: type === 'invoice' ? isRecurring : undefined,
        recurrenceInterval: type === 'invoice' && isRecurring ? recurrenceInterval : undefined,
      };
      const { data } = await api.post<{ id: string }>('/invoicing/invoices', body);
      if (andPost) await api.post(`/invoicing/invoices/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/invoicing/invoices/${id}`),
  });

  const valid = !!customerId && lines.every((l) => l.description && safe(l.quantity).greaterThan(0) && safe(l.unitPrice).greaterThan(0));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{type === 'quote' ? L('New Quote', 'عرض سعر جديد') : L('New Invoice', 'فاتورة جديدة')}</h1>
        <div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf,text/plain" className="hidden" onChange={(e) => void handleFileExtract(e)} />
          <button type="button" disabled={extracting} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-60" onClick={() => fileRef.current?.click()}>
            {extracting ? L('Extracting…', 'جاري الاستخراج…') : `📎 ${L('Import from File', 'استيراد من ملف')}`}
          </button>
        </div>
      </div>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={L('Customer', 'العميل')}>
            <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">—</option>
              {customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={L('Date', 'التاريخ')}><input type="date" dir="ltr" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={L('Payment terms', 'شروط الدفع')}>
            <select className={inputCls} value={terms} onChange={(e) => setTerms(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">{L('Customer default', 'افتراضي العميل')}</option>
              {[0, 15, 30, 60, 90].map((d) => <option key={d} value={d}>{d === 0 ? 'Net 0' : `Net ${d}`}</option>)}
            </select>
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Description', 'الوصف')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Qty', 'الكمية')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Unit price', 'السعر')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Disc %', 'خصم %')}</th>
                <th className="px-2 py-2 text-start font-medium">{L('VAT', 'الضريبة')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Total', 'الإجمالي')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const c = calc(l);
                return (
                  <tr key={i}>
                    <td className="px-2 py-1"><input className={inputCls} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                    <td className="px-2 py-1 w-24"><input dir="ltr" inputMode="decimal" className={`${inputCls} text-end`} value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} /></td>
                    <td className="px-2 py-1 w-32"><input dir="ltr" inputMode="decimal" className={`${inputCls} text-end`} value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} /></td>
                    <td className="px-2 py-1 w-24"><input dir="ltr" inputMode="decimal" className={`${inputCls} text-end`} value={l.discountPct} onChange={(e) => update(i, { discountPct: e.target.value })} /></td>
                    <td className="px-2 py-1 w-36">
                      <select className={inputCls} value={l.vatType} onChange={(e) => update(i, { vatType: e.target.value as VatType })}>
                        <option value="standard">5%</option>
                        <option value="zero_rated">{L('Zero-rated', 'صفر')}</option>
                        <option value="exempt">{L('Exempt', 'معفى')}</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 text-end font-mono" dir="ltr">{toDb(add(c.sub, c.vat)).slice(0, 12)}</td>
                    <td className="px-2 py-1">
                      {lines.length > 1 && <button type="button" className="text-red-600" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>×</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, blank()])}>+ {L('Add line', 'إضافة سطر')}</button>

        {type === 'invoice' && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-border" />
              {L('Make Recurring', 'تكرار الفاتورة')}
            </label>
            {isRecurring && (
              <select className={inputCls + ' w-40'} value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(e.target.value as 'weekly' | 'monthly' | 'quarterly')}>
                <option value="weekly">{L('Weekly', 'أسبوعي')}</option>
                <option value="monthly">{L('Monthly', 'شهري')}</option>
                <option value="quarterly">{L('Quarterly', 'ربع سنوي')}</option>
              </select>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L('Notes', 'ملاحظات')}><textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="space-y-1 self-end text-sm font-mono" dir="ltr">
            <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>VAT 5%</span><span>{vat.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Total</span><span>{total.toFixed(2)} AED</span></div>
          </div>
        </div>

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>
            {L('Save Draft', 'حفظ كمسودة')}
          </button>
          {type === 'invoice' && (
            <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>
              {L('Post', 'ترحيل')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceInner />
    </Suspense>
  );
}
