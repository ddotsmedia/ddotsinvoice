'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, money, mul, div, toDb } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged, FiscalYear } from '@/lib/accounting-types';
import type { Branch, Grn, Supplier } from '@/lib/purchasing-types';

interface Line { itemId: string; description: string; qty: string; unitPrice: string; vatRate: string }

export default function NewSupplierInvoicePage() {
  const L = useLabel();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [grnId, setGrnId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [supplierRef, setRef] = useState('');
  const [lines, setLines] = useState<Line[]>([{ itemId: '', description: '', qty: '1', unitPrice: '0', vatRate: '5' }]);

  const suppliers = useQuery({ queryKey: ['suppliers', ''], queryFn: async () => (await api.get<Paged<Supplier>>('/purchasing/suppliers', { params: { limit: 100 } })).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const grns = useQuery({ queryKey: ['grns'], queryFn: async () => (await api.get<Paged<Grn>>('/purchasing/goods-receipts', { params: { limit: 100, status: 'posted' } })).data });
  const years = useQuery({ queryKey: ['fiscal-years'], queryFn: async () => (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data });

  // Pre-fill from GRN lines
  const chooseGrn = (id: string) => {
    setGrnId(id);
    const g = grns.data?.items.find((x) => x.id === id);
    if (g) {
      setSupplierId(g.supplierId);
      setBranchId(g.branchId);
      setLines(g.lines.map((l) => ({ itemId: l.itemId ?? '', description: l.description, qty: l.qtyReceived, unitPrice: l.unitCost, vatRate: l.vatRate })));
    }
  };

  const L2 = (l: Line) => {
    const sub = mul(money(l.qty || '0'), money(l.unitPrice || '0'));
    return { sub, vat: mul(sub, div(money(l.vatRate || '0'), money(100))) };
  };
  const total = lines.reduce((a, l) => add(add(a, L2(l).sub), L2(l).vat), money(0));

  const save = useMutation({
    mutationFn: async () => {
      const fy = years.data?.find((y) => y.status === 'open')?.id;
      const { data } = await api.post<{ id: string }>('/purchasing/supplier-invoices', {
        supplierId, branchId, grnId: grnId || undefined, fiscalYearId: fy, supplierRef: supplierRef || undefined, date, dueDate,
        lines: lines.map((l) => ({ ...l, itemId: l.itemId || undefined })),
      });
      await api.post(`/purchasing/supplier-invoices/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/purchasing/supplier-invoices/${id}`),
  });

  const valid = !!supplierId && !!branchId && lines.every((l) => l.description && money(l.qty || '0').greaterThan(0));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Supplier Invoice', 'فاتورة مورد جديدة')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L('Goods receipt', 'استلام البضائع')}>
            <select className={inputCls} value={grnId} onChange={(e) => chooseGrn(e.target.value)}>
              <option value="">{L('No GRN', 'بدون استلام')}</option>
              {grns.data?.items.map((g) => <option key={g.id} value={g.id}>{g.number}</option>)}
            </select>
          </Field>
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
          <Field label={L('Supplier ref', 'مرجع المورد')}><input className={inputCls} value={supplierRef} onChange={(e) => setRef(e.target.value)} /></Field>
          <Field label={L('Date', 'التاريخ')}><input type="date" dir="ltr" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={L('Due date', 'تاريخ الاستحقاق')}><input type="date" dir="ltr" className={inputCls} value={dueDate} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Description', 'الوصف')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Qty', 'الكمية')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Price', 'السعر')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('VAT %', 'الضريبة %')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-2 py-1"><input className={inputCls} value={l.description} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, description: e.target.value } : x)))} /></td>
                  <td className="w-24 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.qty} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} /></td>
                  <td className="w-28 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.unitPrice} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, unitPrice: e.target.value } : x)))} /></td>
                  <td className="w-24 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.vatRate} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === i ? { ...x, vatRate: e.target.value } : x)))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, { itemId: '', description: '', qty: '1', unitPrice: '0', vatRate: '5' }])}>+ {L('Add line', 'إضافة سطر')}</button>

        <div className="ms-auto max-w-sm font-mono text-sm" dir="ltr">Total {toDb(total).slice(0, 14)}</div>
        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end">
          <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate()}>{L('Post', 'ترحيل')}</button>
        </div>
      </div>
    </div>
  );
}
