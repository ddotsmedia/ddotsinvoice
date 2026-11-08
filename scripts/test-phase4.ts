import Decimal from 'decimal.js';

// Phase 4 smoke test. Env: API (default http://localhost:4101), SMOKE_EMAIL, SMOKE_PASSWORD (company_admin)
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

async function main() {
  const login = await call<{ accessToken: string }>('POST', '/auth/login', { email: EMAIL, password: PASS });
  token = login.data.accessToken;
  check('login', login.status === 200);

  const year = new Date().toISOString().slice(0, 4);
  const today = `${year}-11-08`;
  await call('POST', '/accounting/fiscal-years', { name: `FY ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` });
  const branch = await call('POST', '/branches', { name: 'HQ', isHQ: true });
  const branchId = branch.data.id;

  // Accounts: Inventory 1500 (created if missing), COGS 5000 (seeded)
  let tree = (await call<any[]>('GET', '/accounting/accounts')).data;
  const flat = (n: any[]): any[] => n.flatMap((x) => [x, ...flat(x.children)]);
  let acc = flat(tree);
  if (!acc.find((a) => a.code === '1500')) {
    await call('POST', '/accounting/accounts', { code: '1500', name: 'Inventory', type: 'asset' });
    acc = flat((await call<any[]>('GET', '/accounting/accounts')).data);
  }
  const inv = acc.find((a) => a.code === '1500')!.id;
  const cogs = acc.find((a) => a.code === '5000')!.id;

  // Step 1: supplier
  const sup = await call('POST', '/purchasing/suppliers', { code: 'SUP001', nameEn: 'Test Supplier', nameAr: 'مورد تجريبي', trn: '123456789012345' });
  check('create supplier', sup.status === 201, JSON.stringify(sup.data));
  const supplierId = sup.data.id;

  // Step 2: items
  const it1 = await call('POST', '/purchasing/inventory/items', { code: 'ITEM001', nameEn: 'Test Item', nameAr: 'صنف تجريبي', unit: 'PCS', costMethod: 'avco', inventoryAccountId: inv, cogsAccountId: cogs });
  check('create item', it1.status === 201, JSON.stringify(it1.data));
  const itemId = it1.data.id;
  const it2 = await call('POST', '/purchasing/inventory/items', { code: 'ITEM002', nameEn: 'Test Item 2', nameAr: 'صنف 2', unit: 'PCS', costMethod: 'avco', inventoryAccountId: inv, cogsAccountId: cogs });
  const item2Id = it2.data.id;

  // Step 3: default warehouse
  const whs = (await call<any[]>('GET', '/purchasing/warehouses')).data;
  const wh = whs.find((w) => w.isDefault)!.id;
  check('default warehouse', !!wh);

  // Step 4: PO
  const po = await call('POST', '/purchasing/purchase-orders', {
    supplierId, branchId, fiscalYearId: (await call<any[]>('GET', '/accounting/fiscal-years')).data[0].id, date: today,
    lines: [
      { itemId, description: 'Item', qty: '100', unitPrice: '10', vatRate: '5' },
      { itemId: item2Id, description: 'Item2', qty: '50', unitPrice: '20', vatRate: '0' },
    ],
  });
  check('create PO', po.status === 201 && po.data.number === `PO-${year}-00001`, JSON.stringify(po.data).slice(0, 200));
  const poId = po.data.id;
  const poLines = po.data.lines;

  // Step 5-6
  const sub = await call('POST', `/purchasing/purchase-orders/${poId}/submit`);
  check('submit PO', sub.data.status === 'submitted');
  const appr = await call('POST', `/purchasing/purchase-orders/${poId}/approve`);
  check('approve PO', appr.data.status === 'approved');

  // Step 7: GRN for PO
  const grnBody = (lines: any[]) => ({ supplierId, poId, branchId, fiscalYearId: po.data.fiscalYearId, date: today, lines });
  const grn1 = await call('POST', '/purchasing/goods-receipts', grnBody([
    { poLineId: poLines[0].id, itemId, description: 'Item', qtyReceived: '100', unitCost: '10', vatRate: '5', warehouseId: wh },
    { poLineId: poLines[1].id, itemId: item2Id, description: 'Item2', qtyReceived: '50', unitCost: '20', vatRate: '0', warehouseId: wh },
  ]));
  check('create GRN', grn1.status === 201, JSON.stringify(grn1.data).slice(0, 200));
  const grn1Id = grn1.data.id;

  // Step 8: post GRN
  const p1 = await call('POST', `/purchasing/goods-receipts/${grn1Id}/post`);
  check('post GRN', p1.data.status === 'posted' && !!p1.data.journalEntryId, JSON.stringify(p1.data).slice(0, 200));
  jes.push(p1.data.journalEntryId);

  // Step 9: balance 100 @ 10
  const b1 = (await call<any[]>('GET', `/purchasing/inventory/balances?itemId=${itemId}&warehouseId=${wh}`)).data[0];
  check('balance qty 100', d(b1.qty).eq(100));
  check('balance avgCost 10', d(b1.avgCost).eq(10));

  // Step 10: second GRN 50 @ 12 → avg (100*10+50*12)/150
  const grn2 = await call('POST', '/purchasing/goods-receipts', { supplierId, branchId, fiscalYearId: po.data.fiscalYearId, date: today, lines: [
    { itemId, description: 'Item', qtyReceived: '50', unitCost: '12', vatRate: '0', warehouseId: wh },
  ] });
  const p2 = await call('POST', `/purchasing/goods-receipts/${grn2.data.id}/post`);
  jes.push(p2.data.journalEntryId);
  const b2 = (await call<any[]>('GET', `/purchasing/inventory/balances?itemId=${itemId}&warehouseId=${wh}`)).data[0];
  const expectedAvg = new Decimal(1600).div(150).toDecimalPlaces(2);
  check('balance qty 150', d(b2.qty).eq(150));
  check('avgCost 10.67', d(b2.avgCost).toDecimalPlaces(2).eq(expectedAvg), `got ${b2.avgCost}`);

  // Step 11: supplier invoice matching GRN1 (lines mirror GRN1)
  const si = await call('POST', '/purchasing/supplier-invoices', {
    supplierId, grnId: grn1Id, poId, branchId, fiscalYearId: po.data.fiscalYearId, date: today, dueDate: today,
    lines: [
      { itemId, description: 'Item', qty: '100', unitPrice: '10', vatRate: '5' },
      { itemId: item2Id, description: 'Item2', qty: '50', unitPrice: '20', vatRate: '0' },
    ],
  });
  check('create SINV', si.status === 201 && si.data.number === `SINV-${year}-00001`, JSON.stringify(si.data).slice(0, 200));
  const siId = si.data.id;

  // Step 12: post SINV
  const ps = await call('POST', `/purchasing/supplier-invoices/${siId}/post`);
  check('post SINV', ps.data.status === 'posted' && ps.data.matchingStatus === 'matched' && !!ps.data.journalEntryId);
  jes.push(ps.data.journalEntryId);

  // Step 13: three-way match
  const m = (await call('GET', `/purchasing/supplier-invoices/${siId}/three-way-match`)).data;
  check('three-way matched', m.status === 'matched' && d(m.variance).eq(0), JSON.stringify(m));

  // Step 14: stock report
  const rep = (await call<any[]>('GET', '/purchasing/inventory/stock-report')).data;
  const row = rep.find((r) => r.itemId === itemId && r.warehouseId === wh);
  check('stock report row', !!row && d(row.qty).eq(150) && d(row.avgCost).toDecimalPlaces(2).eq(expectedAvg));

  // Step 15-16: adjustment +10
  const adj = await call('POST', '/purchasing/inventory/adjustment', { itemId, warehouseId: wh, qty: '10', note: 'Physical count', date: today });
  check('adjustment posted', adj.status === 201 && !!adj.data.journalEntryId, JSON.stringify(adj.data).slice(0, 200));
  jes.push(adj.data.journalEntryId);
  const b3 = (await call<any[]>('GET', `/purchasing/inventory/balances?itemId=${itemId}&warehouseId=${wh}`)).data[0];
  check('balance qty 160', d(b3.qty).eq(160));

  // Step 17: every journal balanced
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
