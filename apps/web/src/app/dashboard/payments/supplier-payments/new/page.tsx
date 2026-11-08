'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, money, sub, type Money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged, FiscalYear } from '@/lib/accounting-types';
import type { Branch, Si, Supplier } from '@/lib/purchasing-types';

interface BankAccount { id: string; nameEn: string; nameAr: string }
const safe = (v: string): Money => { try { return money(v || '0'); } catch { return money(0); } };

export default function NewSupplierPaymentPage() {
  const L = useLabel();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [bankAccountId, setBank] = useState('');
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const suppliers = useQuery({ queryKey: ['suppliers', ''], queryFn: async () => (await api.get<Paged<Supplier>>('/purchasing/suppliers', { params: { limit: 100 } })).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const banks = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<Paged<BankAccount>>('/payments/bank-accounts', { params: { limit: 100 } })).data });
  const sinvs = useQuery({ queryKey: ['sinvs'], queryFn: async () => (await api.get<Paged<Si>>('/purchasing/supplier-invoices', { params: { limit: 100 } })).data });
  const open = (sinvs.data?.items ?? []).filter((i) => i.supplierId === supplierId && ['posted', 'partially_paid'].includes(i.status));

  const allocated = Object.values(alloc).reduce((a, v) => add(a, safe(v)), money(0));
  const remaining = sub(safe(amount), allocated);

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const fy = (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data.find((y) => y.status === 'open')?.id;
      const allocations = Object.entries(alloc).filter(([, v]) => safe(v).greaterThan(0)).map(([supplierInvoiceId, v]) => ({ supplierInvoiceId, allocatedAmount: v }));
      const { data } = await api.post<{ id: string }>('/payments/supplier-payments', {
        supplierId, branchId, fiscalYearId: fy, date, amount, paymentMethod: 'bank_transfer',
        bankAccountId: bankAccountId || undefined, allocations,
      });
      if (andPost) await api.post(`/payments/supplier-payments/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/payments/supplier-payments/${id}`),
  });

  const valid = !!supplierId && !!branchId && safe(amount).greaterThan(0) && remaining.greaterThanOrEqualTo(0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Supplier Payment', 'دفعة مورد جديدة')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L('Supplier', 'المورد')}>
            <select className={inputCls} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setAlloc({}); }}>
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
          <Field label={L('Amount', 'المبلغ')}><input dir="ltr" className={`${inputCls} text-end`} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label={L('Bank account', 'الحساب البنكي')}>
            <select className={inputCls} value={bankAccountId} onChange={(e) => setBank(e.target.value)}>
              <option value="">{L('Cash on hand', 'النقدية')}</option>
              {banks.data?.items.map((b) => <option key={b.id} value={b.id}>{L(b.nameEn, b.nameAr)}</option>)}
            </select>
          </Field>
        </div>

        <h2 className="font-semibold">{L('Allocate to supplier invoices', 'تخصيص لفواتير الموردين')}</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-2 py-2 text-start font-medium">{L('Invoice', 'الفاتورة')}</th>
              <th className="px-2 py-2 text-end font-medium">{L('Total', 'الإجمالي')}</th>
              <th className="px-2 py-2 text-end font-medium">{L('Allocate', 'تخصيص')}</th>
            </tr>
          </thead>
          <tbody>
            {open.map((i) => (
              <tr key={i.id} className="border-t border-border dark:border-slate-800">
                <td className="px-2 py-2 font-mono" dir="ltr">{i.number}</td>
                <td className="px-2 py-2 text-end font-mono" dir="ltr">{money(i.total ?? '0').toFixed(2)}</td>
                <td className="px-2 py-2 text-end">
                  <input dir="ltr" className={`${inputCls} w-36 text-end`} value={alloc[i.id] ?? ''} onChange={(e) => setAlloc((a) => ({ ...a, [i.id]: e.target.value }))} />
                </td>
              </tr>
            ))}
            {supplierId && !open.length && <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">{L('No open invoices', 'لا توجد فواتير مفتوحة')}</td></tr>}
          </tbody>
        </table>
        <div className="ms-auto max-w-sm font-mono text-sm" dir="ltr">Unallocated {remaining.toFixed(2)}</div>

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>{L('Save Draft', 'حفظ كمسودة')}</button>
          <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>{L('Post', 'ترحيل')}</button>
        </div>
      </div>
    </div>
  );
}
