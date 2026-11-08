'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { add, money, sub, type Money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { Field, btnCls, cardCls, inputCls } from '@/components/ui';
import { errMsg, useLabel } from '@/lib/ui-helpers';
import type { Paged, FiscalYear } from '@/lib/accounting-types';
import type { Branch } from '@/lib/purchasing-types';
import type { Customer, InvoiceRow } from '@/lib/invoicing-types';

interface BankAccount { id: string; nameEn: string; nameAr: string }
const safe = (v: string): Money => { try { return money(v || '0'); } catch { return money(0); } };

function NewReceiptInner() {
  const L = useLabel();
  const router = useRouter();
  const sp = useSearchParams();
  const [customerId, setCustomerId] = useState(sp.get('customer') ?? '');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'cheque' | 'bank_transfer' | 'card'>('bank_transfer');
  const [bankAccountId, setBank] = useState('');
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const customers = useQuery({ queryKey: ['customers', ''], queryFn: async () => (await api.get<Paged<Customer>>('/invoicing/customers', { params: { limit: 100 } })).data });
  const branches = useQuery({ queryKey: ['branches'], queryFn: async () => (await api.get<Paged<Branch>>('/branches', { params: { limit: 100 } })).data });
  const banks = useQuery({ queryKey: ['bank-accounts'], queryFn: async () => (await api.get<Paged<BankAccount>>('/payments/bank-accounts', { params: { limit: 100 } })).data });
  const invoices = useQuery({
    queryKey: ['open-invoices', customerId],
    enabled: !!customerId,
    queryFn: async () => (await api.get<Paged<InvoiceRow>>('/invoicing/invoices', { params: { type: 'invoice', customerId, limit: 100 } })).data,
  });
  const open = (invoices.data?.items ?? []).filter((i) => ['posted', 'partially_paid', 'overdue'].includes(i.status));

  const allocated = Object.values(alloc).reduce((a, v) => add(a, safe(v)), money(0));
  const remaining = sub(safe(amount), allocated);

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const fy = (await api.get<FiscalYear[]>('/accounting/fiscal-years')).data.find((y) => y.status === 'open')?.id;
      const allocations = Object.entries(alloc).filter(([, v]) => safe(v).greaterThan(0)).map(([invoiceId, v]) => ({ invoiceId, allocatedAmount: v }));
      const { data } = await api.post<{ id: string }>('/payments/customer-payments', {
        customerId, branchId, fiscalYearId: fy, date, amount, paymentMethod: method,
        bankAccountId: bankAccountId || undefined, allocations,
      });
      if (andPost) await api.post(`/payments/customer-payments/${data.id}/post`);
      return data.id;
    },
    onSuccess: (id) => router.push(`/dashboard/payments/customer-payments/${id}`),
  });

  const valid = !!customerId && !!branchId && safe(amount).greaterThan(0) && remaining.greaterThanOrEqualTo(0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('New Customer Receipt', 'إيصال عميل جديد')}</h1>
      <div className={`${cardCls} space-y-4 p-6`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={L('Customer', 'العميل')}>
            <select className={inputCls} value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAlloc({}); }}>
              <option value="">—</option>
              {customers.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          <Field label={L('Method', 'الطريقة')}>
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              <option value="bank_transfer">{L('Bank transfer', 'تحويل بنكي')}</option>
              <option value="cash">{L('Cash', 'نقد')}</option>
              <option value="cheque">{L('Cheque', 'شيك')}</option>
              <option value="card">{L('Card', 'بطاقة')}</option>
            </select>
          </Field>
          <Field label={L('Bank account', 'الحساب البنكي')}>
            <select className={inputCls} value={bankAccountId} onChange={(e) => setBank(e.target.value)}>
              <option value="">{L('Cash on hand', 'النقدية')}</option>
              {banks.data?.items.map((b) => <option key={b.id} value={b.id}>{L(b.nameEn, b.nameAr)}</option>)}
            </select>
          </Field>
        </div>

        <h2 className="font-semibold">{L('Allocate to invoices', 'تخصيص للفواتير')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2 text-start font-medium">{L('Invoice', 'الفاتورة')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Balance', 'الرصيد')}</th>
                <th className="px-2 py-2 text-end font-medium">{L('Allocate', 'تخصيص')}</th>
              </tr>
            </thead>
            <tbody>
              {open.map((i) => (
                <tr key={i.id} className="border-t border-border dark:border-slate-800">
                  <td className="px-2 py-2 font-mono" dir="ltr">{i.number}</td>
                  <td className="px-2 py-2 text-end font-mono" dir="ltr">{money(i.balanceDue).toFixed(2)}</td>
                  <td className="px-2 py-2 text-end">
                    <input dir="ltr" className={`${inputCls} w-36 text-end`} value={alloc[i.id] ?? ''} onChange={(e) => setAlloc((a) => ({ ...a, [i.id]: e.target.value }))} />
                  </td>
                </tr>
              ))}
              {customerId && !open.length && <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">{L('No open invoices', 'لا توجد فواتير مفتوحة')}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="ms-auto max-w-sm font-mono text-sm" dir="ltr">
          Unallocated {remaining.toFixed(2)}
        </div>

        {save.isError && <p className="text-sm text-red-600">{errMsg(save.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md border border-border px-4 py-2 text-sm" disabled={!valid || save.isPending} onClick={() => save.mutate(false)}>{L('Save Draft', 'حفظ كمسودة')}</button>
          <button type="button" className={btnCls} disabled={!valid || save.isPending} onClick={() => save.mutate(true)}>{L('Post', 'ترحيل')}</button>
        </div>
      </div>
    </div>
  );
}

export default function NewReceiptPage() {
  return <Suspense><NewReceiptInner /></Suspense>;
}
