import Decimal from 'decimal.js';

// Phase 5 smoke test. Env: API (default http://localhost:4101), SMOKE_EMAIL, SMOKE_PASSWORD (company_admin)
const API = process.env.API ?? 'http://localhost:4101';
const EMAIL = process.env.SMOKE_EMAIL!;
const PASS = process.env.SMOKE_PASSWORD ?? 'Password123!';
const jes: string[] = [];
let token = '';
let step = 0;

const d = (v: unknown) => new Decimal(String(v));
const check = (name: string, ok: boolean, info = '') => {
  step++;
  if (!ok) {
    console.log(`✗ ${step} ${name} ${info}`);
    process.exit(1);
  }
  console.log(`✓ ${step} ${name}`);
};

async function call<T = any>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : undefined };
}

const lineOf = (j: any, code: string) => j.lines.find((l: any) => l.code === code);

async function main() {
  token = (await call<{ accessToken: string }>('POST', '/auth/login', { email: EMAIL, password: PASS })).data.accessToken;
  check('login', !!token);

  const year = new Date().toISOString().slice(0, 4);
  const today = `${year}-11-08`;
  await call('POST', '/accounting/fiscal-years', { name: `FY ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` });
  const fy = (await call<any[]>('GET', '/accounting/fiscal-years')).data.find((f) => f.status === 'open')!.id;
  const branchId = (await call('POST', '/branches', { name: 'HQ', isHQ: true })).data.id;

  // Accounts: 1020 bank GL, 4100 revenue (postable)
  const flat = (n: any[]): any[] => n.flatMap((x) => [x, ...flat(x.children)]);
  let acc = flat((await call<any[]>('GET', '/accounting/accounts')).data);
  if (!acc.find((a) => a.code === '1020')) {
    await call('POST', '/accounting/accounts', { code: '1020', name: 'Cash at Bank', type: 'asset' });
  }
  if (!acc.find((a) => a.code === '4100')) {
    const parent = acc.find((a) => a.code === '4000')!.id;
    await call('POST', '/accounting/accounts', { code: '4100', name: 'Sales', type: 'revenue', parentId: parent });
  }
  acc = flat((await call<any[]>('GET', '/accounting/accounts')).data);
  const bankGl = acc.find((a) => a.code === '1020')!.id;

  // Customer + posted invoice totalling 1245 (1200 subtotal + 45 VAT)
  const cust = await call('POST', '/invoicing/customers', { name: 'Pay Customer', trn: '100000000000003', paymentTerms: 30 });
  const inv = await call('POST', '/invoicing/invoices', {
    type: 'invoice', customerId: cust.data.id, date: today,
    lines: [
      { description: 'Consulting', quantity: '2', unitPrice: '500', discountPct: '10', vatType: 'standard' },
      { description: 'Export', quantity: '1', unitPrice: '300', vatType: 'zero_rated' },
    ],
  });
  const invId = inv.data.id;
  await call('POST', `/invoicing/invoices/${invId}/post`);

  // Bank account
  const bank = await call('POST', '/payments/bank-accounts', { code: 'BANK001', nameEn: 'Main Bank', nameAr: 'البنك الرئيسي', bankName: 'Emirates NBD', accountNumber: '1234567890', glAccountId: bankGl });
  check('create bank account', bank.status === 201, JSON.stringify(bank.data));
  const bankId = bank.data.id;

  // Customer receipt
  const rc = await call('POST', '/payments/customer-payments', {
    customerId: cust.data.id, branchId, fiscalYearId: fy, date: today, amount: '1245', paymentMethod: 'bank_transfer', bankAccountId: bankId,
    allocations: [{ invoiceId: invId, allocatedAmount: '1245' }],
  });
  check('create receipt', rc.status === 201 && rc.data.number === `RCPT-${year}-00001`, JSON.stringify(rc.data).slice(0, 200));
  const rcId = rc.data.id;
  const rp = await call('POST', `/payments/customer-payments/${rcId}/post`);
  check('post receipt', rp.data.status === 'posted' && !!rp.data.journalEntryId);
  jes.push(rp.data.journalEntryId);

  const iv = (await call('GET', `/invoicing/invoices/${invId}`)).data;
  check('invoice paid', iv.status === 'paid' && d(iv.paidAmount).eq(1245) && d(iv.balanceDue).eq(0), `status=${iv.status}`);
  const rj = (await call('GET', `/accounting/journals/${rp.data.journalEntryId}`)).data;
  check('receipt DR 1020 1245', d(lineOf(rj, '1020').debit).eq(1245));
  check('receipt CR 1200 1245', d(lineOf(rj, '1200').credit).eq(1245));

  // Supplier invoice + payment
  const sup = await call('POST', '/purchasing/suppliers', { code: 'SUP-P5', nameEn: 'Pay Supplier', nameAr: 'مورد الدفع' });
  const si = await call('POST', '/purchasing/supplier-invoices', {
    supplierId: sup.data.id, branchId, fiscalYearId: fy, date: today, dueDate: today,
    lines: [{ description: 'Goods', qty: '1', unitPrice: '1245', vatRate: '0' }],
  });
  const siId = si.data.id;
  await call('POST', `/purchasing/supplier-invoices/${siId}/post`);
  const sp = await call('POST', '/payments/supplier-payments', {
    supplierId: sup.data.id, branchId, fiscalYearId: fy, date: today, amount: '1245', paymentMethod: 'bank_transfer', bankAccountId: bankId,
    allocations: [{ supplierInvoiceId: siId, allocatedAmount: '1245' }],
  });
  const sPost = await call('POST', `/payments/supplier-payments/${sp.data.id}/post`);
  check('post supplier payment', sPost.data.status === 'posted' && !!sPost.data.journalEntryId);
  jes.push(sPost.data.journalEntryId);
  const sinv = (await call('GET', `/purchasing/supplier-invoices/${siId}`)).data;
  check('supplier invoice settled', d(sinv.balanceDue).eq(0) && sinv.status === 'fully_paid');
  const sj = (await call('GET', `/accounting/journals/${sPost.data.journalEntryId}`)).data;
  check('supplier DR 2100 1245', d(lineOf(sj, '2100').debit).eq(1245));
  check('supplier CR 1020 1245', d(lineOf(sj, '1020').credit).eq(1245));

  // Bank charge, reconcile everything up to statement date
  const bt = await call('POST', '/payments/bank-transactions', { bankAccountId: bankId, date: today, type: 'bank_charge', amount: '25', description: 'Monthly fee' });
  check('bank charge created', bt.status === 201, JSON.stringify(bt.data).slice(0, 200));
  jes.push(bt.data.journalEntryId);
  const chargeRec = await call('POST', `/payments/bank-transactions/${bt.data.id}/reconcile`);
  check('bank charge reconciled', chargeRec.data.isReconciled === true);

  const all = (await call<any>('GET', `/payments/bank-transactions?bankAccountId=${bankId}&limit=100`)).data.items as any[];
  for (const t of all.filter((x) => !x.isReconciled)) await call('POST', `/payments/bank-transactions/${t.id}/reconcile`);

  // Reconciliation: book = 1245 - 1245 - 25 = -25
  const rec = await call('POST', '/payments/reconciliations', { bankAccountId: bankId, statementDate: today, openingBalance: '0', closingBalance: '-25' });
  check('create reconciliation', rec.status === 201, JSON.stringify(rec.data).slice(0, 200));
  const sum = (await call('GET', `/payments/reconciliations/${rec.data.id}/summary`)).data;
  check('reconciliation difference 0', d(sum.difference).eq(0), `diff=${sum.difference}`);
  const closed = await call('POST', `/payments/reconciliations/${rec.data.id}/close`);
  check('reconciliation closed', closed.data.status === 'closed');

  // Void receipt: invoice reverts
  const vr = await call('POST', `/payments/customer-payments/${rcId}/void`);
  check('void receipt', vr.data.status === 'voided', JSON.stringify(vr.data).slice(0, 200));
  const iv2 = (await call('GET', `/invoicing/invoices/${invId}`)).data;
  check('invoice reverted to posted', iv2.status === 'posted' && d(iv2.balanceDue).eq(1245), `status=${iv2.status}`);

  // Every journal balanced
  for (const id of jes) {
    const j = (await call('GET', `/accounting/journals/${id}`)).data;
    const dr = j.lines.reduce((a: Decimal, l: any) => a.plus(l.debit), new Decimal(0));
    const cr = j.lines.reduce((a: Decimal, l: any) => a.plus(l.credit), new Decimal(0));
    check(`journal ${j.number} balanced`, dr.eq(cr), `dr=${dr} cr=${cr}`);
  }
  console.log('PASS');
}

main().catch((e) => {
  console.log(`✗ ${step} error ${e}`);
  process.exit(1);
});
