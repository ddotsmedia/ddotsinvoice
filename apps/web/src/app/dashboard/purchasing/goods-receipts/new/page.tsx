'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged, FiscalYear } from '@/lib/accounting-types';
import type { Branch, Po, Supplier, Warehouse } from '@/lib/purchasing-types';

interface Line { poLineId?: string; itemId?: string; description: string; qty: string; unitCost: string; vatRate: string; warehouseId: string }

function NewGrnInner() {
  const L = useLabel();
  const router = useRouter();
  const sp = useSearchParams();
  const [poId, setPoId] = useState(sp.get('po') ?? '');
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);

  const pos = useQuery({ queryKey: ['pos'], queryFn: async () => (await api.get<Paged<Po>>('/purchasing/purchase-orders', { params: { limit: 100 } })).data });
  const po = useQuery({
    queryKey: ['po', poId],
    enabled: !!poId,
    queryFn: async () => (await api.get<Po>(`/purchasing/purchase-orders/${poId}`)).data,
  });
  const suppliers = useQuery({ queryKey: ['suppliers', ''], queryFn: async () => (await api.get<Paged<Supplier>>('/purchasing/suppliers', { params: { limit: 100 } })).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const warehouses = useQuery({ queryKey: ['warehouses'], queryFn: async () => (await api.get<Warehouse[]>('/purchasing/warehouses')).data });
  const years = useQuery({ queryKey: ['fiscal-years'], queryFn: async () => (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data });

  // Pre-fill lines from the selected PO
  const choosePo = (id: string) => {
    setPoId(id);
    setLines([]);
    const p = pos.data?.items.find((x) => x.id === id);
    if (p) setSupplierId(p.supplierId), setBranchId(p.branchId);
  };
  const defaultWh = warehouses.data?.find((w) => w.isDefault)?.id ?? '';
  const fill = () => {
    if (!po.data) return;
    setLines(po.data.lines.map((l) => ({ poLineId: l.id, itemId: l.itemId ?? undefined, description: l.description, qty: l.qty, unitCost: l.unitPrice, vatRate: l.vatRate, warehouseId: defaultWh })));
  };
  const update = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, x) => (x === i ? { ...l, ...p } : l)));

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const fy = years.data?.find((y) => y.status === 'open')?.id;
      const { data } = await api.post<{ id: string }>('/purchasing/goods-receipts', {
        supplierId, branchId, poId: poId || undefined, fiscalYearId: fy, date,
        lines: lines.map((l) => ({ ...l, poLineId: l.poLineId || undefined, itemId: l.itemId || undefined })),
      });
      if (andPost) await api.post(`/purchasing/goods-receipts/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/purchasing/goods-receipts/${id}`),
  });

  const valid = !!supplierId && !!branchId && lines.length > 0 && lines.every((l) => l.warehouseId && money(l.qty || '0').greaterThan(0));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Goods Receipt', 'استلام بضائع جديد')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label={L('Purchase order', 'أمر الشراء')}>
            <select className={inputCls} value={poId} onChange={(e) => choosePo(e.target.value)}>
              <option value="">{L('No PO', 'بدون أمر شراء')}</option>
              {pos.data?.items.filter((p) => ['approved', 'partially_received'].includes(p.status)).map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}
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
          <Field label={L('Date', 'التاريخ')}><input type="date" dir="ltr" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {poId && <button type="button" className="text-sm text-primary hover:underline" onClick={fill}>{L('Fill from PO', 'تعبئة من أمر الشراء')}</button>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Description', 'الوصف')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Qty received', 'الكمية المستلمة')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Unit cost', 'تكلفة الوحدة')}</th>
                <th className="px-2 py-2 text-start font-medium">{L('Warehouse', 'المستودع')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-2 py-1"><input className={inputCls} value={l.description} onChange={(e) => update(i, { description: e.target.value })} /></td>
                  <td className="w-28 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} /></td>
                  <td className="w-28 px-2 py-1"><input dir="ltr" className={`${inputCls} text-end`} value={l.unitCost} onChange={(e) => update(i, { unitCost: e.target.value })} /></td>
                  <td className="w-48 px-2 py-1">
                    <select className={inputCls} value={l.warehouseId} onChange={(e) => update(i, { warehouseId: e.target.value })}>
                      {warehouses.data?.map((w) => <option key={w.id} value={w.id}>{w.code} {L(w.nameEn, w.nameAr)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!poId && (
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setLines((ls) => [...ls, { itemId: '', description: '', qty: '1', unitCost: '0', vatRate: '5', warehouseId: defaultWh }])}>
            + {L('Add line', 'إضافة سطر')}
          </button>
        )}

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>{L('Save Draft', 'حفظ كمسودة')}</button>
          <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>{L('Post', 'ترحيل')}</button>
        </div>
      </div>
    </div>
  );
}

export default function NewGrnPage() {
  return <Suspense><NewGrnInner /></Suspense>;
}
