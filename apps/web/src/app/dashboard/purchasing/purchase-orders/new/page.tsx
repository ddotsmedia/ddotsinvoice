'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, money, mul, div, sub, toDb, type Money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged, FiscalYear } from '@/lib/accounting-types';
import type { Branch, Item, Supplier } from '@/lib/purchasing-types';

interface Line { itemId: string; description: string; qty: string; unitPrice: string; discount: string; vatRate: string }
const blank = (): Line => ({ itemId: '', description: '', qty: '1', unitPrice: '', discount: '0', vatRate: '5' });
const safe = (v: string): Money => { try { return money(v || '0'); } catch { return money(0); } };
const calc = (l: Line) => {
  const sub_ = sub(mul(safe(l.qty), safe(l.unitPrice)), safe(l.discount));
  return { sub: sub_, vat: mul(sub_, div(safe(l.vatRate), money(100))) };
};

export default function NewPoPage() {
  const L = useLabel();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([blank()]);

  const suppliers = useQuery({ queryKey: ['suppliers', ''], queryFn: async () => (await api.get<Paged<Supplier>>('/purchasing/suppliers', { params: { limit: 100 } })).data });
  const items = useQuery({ queryKey: ['items'], queryFn: async () => (await api.get<Item[]>('/purchasing/inventory/items')).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const years = useQuery({ queryKey: ['fiscal-years'], queryFn: async () => (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data });

  const subtotal = lines.reduce((a, l) => add(a, calc(l).sub), money(0));
  const vat = lines.reduce((a, l) => add(a, calc(l).vat), money(0));
  const update = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, x) => (x === i ? { ...l, ...p } : l)));

  const save = useMutation({
    mutationFn: async (andSubmit: boolean) => {
      const fy = years.data?.find((y) => y.status === 'open')?.id;
      const { data } = await api.post<{ id: string }>('/purchasing/purchase-orders', {
        supplierId, branchId, fiscalYearId: fy, date,
        lines: lines.map((l) => ({ itemId: l.itemId || undefined, description: l.description, qty: l.qty, unitPrice: l.unitPrice, discount: l.discount || '0', vatRate: l.vatRate })),
      });
      if (andSubmit) await api.post(`/purchasing/purchase-orders/${data.id}/submit`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/purchasing/purchase-orders/${id}`),
  });

  const valid = !!supplierId && !!branchId && lines.every((l) => l.description && safe(l.qty).greaterThan(0) && safe(l.unitPrice).greaterThan(0));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Purchase Order', 'أمر شراء جديد')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L('Supplier', 'المورد')}>
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {suppliers.data?.items.map((s) => <option key={s.id} value={s.id}>{s.code} {s.nameEn}</option>)}
            </select>
          </Field>
          <Field label={L('Branch', 'الفرع')}>
            <select className={inputCls} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">—</option>
              {branches.data?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label={L('Date', 'التاريخ')}><input type="date" dir="ltr" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Item', 'الصنف')}</th>
                <th className="px-2 py-2 text-start font-medium">{L('Description', 'الوصف')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Qty', 'الكمية')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Price', 'السعر')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('VAT %', 'الضريبة %')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Total', 'الإجمالي')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <select className={inputCls} value={l.itemId} onChange={(e) => {
                      const it = items.data?.find((x) => x.id === e.target.value);
                      update(i, { itemId: e.target.value, description: it ? L(it.nameEn, it.nameAr) : l.description });
                    }}>
                      <option value="">—</option>
                      {items.data?.map((it) => <option key={it.id} value={it.id}>{it.code} {it.nameEn}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1"><input className={inputCls} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                  <td className="w-24 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} /></td>
                  <td className="w-28 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} /></td>
                  <td className="w-24 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.vatRate} onChange={(e) => update(i, { vatRate: e.target.value })} /></td>
                  <td className="px-2 py-1 text-end font-mono" dir="ltr">{add(calc(l).sub, calc(l).vat).toFixed(2)}</td>
                  <td className="px-2 py-1">{lines.length > 1 && <button type="button" className="text-red-600" onClick={() => setLines((ls) => ls.filter((_, x) => x !== i))}>×</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, blank()])}>+ {L('Add line', 'إضافة سطر')}</button>

        <div className="ms-auto max-w-sm space-y-1 font-mono text-sm" dir="ltr">
          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{vat.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{toDb(add(subtotal, vat)).slice(0, 14)}</span></div>
        </div>

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>{L('Save Draft', 'حفظ كمسودة')}</button>
          <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>{L('Save & Submit', 'حفظ وإرسال')}</button>
        </div>
      </div>
    </div>
  );
}
