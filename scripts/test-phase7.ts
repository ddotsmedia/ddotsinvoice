import Decimal from 'decimal.js';

// Phase 7 smoke test. Env: API (default http://localhost:4101), SMOKE_EMAIL, SMOKE_PASSWORD (company_admin)
const API = process.env.API ?? 'http://localhost:4101';
const EMAIL = process.env.SMOKE_EMAIL!;
const PASS = process.env.SMOKE_PASSWORD ?? 'Password123!';
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

async function main() {
  token = (await call<{ accessToken: string }>('POST', '/auth/login', { email: EMAIL, password: PASS })).data.accessToken;
  check('login', !!token);

  const year = new Date().toISOString().slice(0, 4);
  const today = new Date().toISOString().slice(0, 10);
  await call('POST', '/accounting/fiscal-years', { name: `FY ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` });
  const fy = (await call<any[]>('GET', '/accounting/fiscal-years')).data.find((f) => f.status === 'open')!.id;
  const branchId = (await call('POST', '/branches', { name: 'HQ', isHQ: true })).data.id;

  const flat = (n: any[]): any[] => n.flatMap((x) => [x, ...flat(x.children)]);
  let acc = flat((await call<any[]>('GET', '/accounting/accounts')).data);
  if (!acc.find((a) => a.code === '4100')) {
    const parent = acc.find((a) => a.code === '4000')!.id;
    await call('POST', '/accounting/accounts', { code: '4100', name: 'Sales', type: 'revenue', parentId: parent });
    acc = flat((await call<any[]>('GET', '/accounting/accounts')).data);
  }
  const byCode = (c: string) => acc.find((a) => a.code === c)!.id as string;

  // AR: C1 invoice dated today (current); C2 invoice dated January (120+ past due)
  const c1 = (await call('POST', '/invoicing/customers', { name: 'Customer One', trn: '100000000000003', paymentTerms: 30 })).data.id;
  const c2 = (await call('POST', '/invoicing/customers', { name: 'Customer Two', trn: '100000000000011', paymentTerms: 30 })).data.id;
  const line = (price: string) => [{ description: 'Service', quantity: '1', unitPrice: price, vatType: 'standard' }];
  const i1 = (await call('POST', '/invoicing/invoices', { type: 'invoice', customerId: c1, date: today, lines: line('1000') })).data.id;
  const i2 = (await call('POST', '/invoicing/invoices', { type: 'invoice', customerId: c2, date: `${year}-01-10`, lines: line('2000') })).data.id;
  await call('POST', `/invoicing/invoices/${i1}/post`);
  const p2 = await call('POST', `/invoicing/invoices/${i2}/post`);
  check('post 2 invoices', p2.status === 201 && p2.data.status === 'posted', JSON.stringify(p2.data).slice(0, 200));

  // AP: supplier invoice 500
  const sup = (await call('POST', '/purchasing/suppliers', { code: 'SUP-P7', nameEn: 'Supplier P7', nameAr: 'مورد' })).data.id;
  const si = (await call('POST', '/purchasing/supplier-invoices', {
    supplierId: sup, branchId, fiscalYearId: fy, date: today, dueDate: today,
    lines: [{ description: 'Goods', qty: '1', unitPrice: '500', vatRate: '0' }],
  })).data.id;
  const sp = await call('POST', `/purchasing/supplier-invoices/${si}/post`);
  check('post supplier invoice', sp.data.status === 'posted');

  // Balance sheet balances
  const bs = (await call('GET', `/reports/balance-sheet?asOfDate=${today}`)).data;
  check('balance sheet balanced', bs.balanced === true && d(bs.totalAssets).eq(d(bs.totalLiabilities).plus(bs.totalEquity)), `A=${bs.totalAssets}`);

  // Income statement arithmetic
  const is = (await call('GET', `/reports/income-statement?fromDate=${year}-01-01&toDate=${today}`)).data;
  check('income revenue > 0', d(is.totalRevenue).greaterThan(0), `rev=${is.totalRevenue}`);
  const expectNet = d(is.totalRevenue).minus(is.totalCogs).minus(is.totalOperatingExpenses);
  check('net profit = revenue - cogs - opex', d(is.netProfit).eq(expectNet), `net=${is.netProfit}`);

  // Trial balance
  const tb = (await call('GET', `/reports/trial-balance?asOfDate=${today}`)).data;
  check('trial balance debits = credits', d(tb.totalDebits).eq(d(tb.totalCredits)), `dr=${tb.totalDebits} cr=${tb.totalCredits}`);

  // Receivables aging: C1 current, C2 120+
  const ar = (await call('GET', `/reports/aging/receivables?asOfDate=${today}`)).data;
  const r1 = ar.rows.find((r: any) => r.partyId === c1);
  const r2 = ar.rows.find((r: any) => r.partyId === c2);
  check('aging lists both customers', !!r1 && !!r2);
  check('C1 in current bucket', d(r1.current).eq(1050), JSON.stringify(r1));
  check('C2 in 120+ bucket', d(r2.d120plus).eq(2100), JSON.stringify(r2));

  // Sales by customer sorted desc
  const sbc = (await call('GET', `/reports/sales/by-customer?fromDate=${year}-01-01&toDate=${today}`)).data;
  const sorted = sbc.every((r: any, i: number) => i === 0 || d(sbc[i - 1].totalAmount).greaterThanOrEqualTo(r.totalAmount));
  check('sales by customer sorted desc', sorted && sbc[0].customerId === c2);

  // Dashboard KPIs
  const dash = (await call('GET', `/reports/dashboard?fromDate=${year}-01-01&toDate=${today}`)).data;
  const kpis = ['totalRevenue', 'totalExpenses', 'netProfit', 'outstandingReceivables', 'outstandingPayables', 'cashBalance'];
  check('dashboard has 6 KPIs', kpis.every((k) => dash[k] !== undefined));

  // Budget + refresh actuals
  const bud = await call('POST', '/budgets', {
    name: `Budget ${year}`, fiscalYear: Number(year),
    lines: [
      { accountId: byCode('4100'), budgetedAmount: '2500' },
      { accountId: byCode('1200'), budgetedAmount: '1000' },
      { accountId: byCode('2100'), budgetedAmount: '300' },
    ],
  });
  check('create budget 3 lines', bud.status === 201 && bud.data.lines.length === 3, JSON.stringify(bud.data).slice(0, 200));
  const ref = await call('POST', `/budgets/${bud.data.id}/refresh-actuals`);
  const revLine = ref.data.lines.find((l: any) => l.code === '4100');
  check('refresh actuals: revenue 3000', d(revLine.actualAmount).eq(3000), `actual=${revLine.actualAmount}`);
  console.log('PASS');
}

main().catch((e) => {
  console.log(`✗ ${step} error ${e}`);
  process.exit(1);
});
