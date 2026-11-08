import Decimal from 'decimal.js';

// Phase 6 smoke test. Env: API (default http://localhost:4101), SMOKE_EMAIL, SMOKE_PASSWORD (company_admin)
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

async function raw(method: string, path: string, body?: unknown): Promise<{ status: number; text: string }> {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

async function call<T = any>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const r = await raw(method, path, body);
  return { status: r.status, data: r.text ? JSON.parse(r.text) : undefined };
}

const lineOf = (j: any, code: string) => j.lines.find((l: any) => l.code === code);

async function main() {
  token = (await call<{ accessToken: string }>('POST', '/auth/login', { email: EMAIL, password: PASS })).data.accessToken;
  check('login', !!token);

  const now = new Date();
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  const hire = new Date(now);
  hire.setUTCFullYear(hire.getUTCFullYear() - 2);
  const hireDate = hire.toISOString().slice(0, 10);
  await call('POST', '/accounting/fiscal-years', { name: `FY ${year}`, startDate: `${year}-01-01`, endDate: `${year}-12-31` });

  const dept = await call('POST', '/hr/departments', { code: 'ADM', nameEn: 'Administration', nameAr: 'الإدارة' });
  check('create department', dept.status === 201);

  const mk = async (nameEn: string, basic: string, housing: string, transport: string) => {
    const e = await call('POST', '/hr/employees', { nameEn, nameAr: nameEn, jobTitle: 'Staff', hireDate, departmentId: dept.data.id, nationality: 'AE' });
    await call('POST', `/hr/employees/${e.data.id}/salary-structure`, { effectiveDate: hireDate, basicSalary: basic, housingAllowance: housing, transportAllowance: transport, otherAllowances: '0' });
    return e.data.id as string;
  };
  const emp1 = await mk('Ali Test', '5000', '1000', '500');
  const emp2 = await mk('Sara Test', '8000', '2000', '1000');
  check('create 2 employees', !!emp1 && !!emp2);

  // Payroll
  const gen = await call('POST', '/hr/payroll/generate', { periodYear: 2026, periodMonth: 11 });
  check('generate payroll', gen.status === 201 && gen.data.lines.length === 2, JSON.stringify(gen.data).slice(0, 200));
  check('totalGross 17500', d(gen.data.totalGross).eq(17500), `got ${gen.data.totalGross}`);
  const runId = gen.data.id;

  const ap = await call('POST', `/hr/payroll/${runId}/approve`);
  check('approve payroll', ap.data.status === 'approved');
  const pay = await call('POST', `/hr/payroll/${runId}/pay`);
  check('pay payroll', pay.data.status === 'paid' && !!pay.data.journalEntryId);
  const pj = (await call('GET', `/accounting/journals/${pay.data.journalEntryId}`)).data;
  check('payroll DR 6200 17500', d(lineOf(pj, '6200').debit).eq(17500));
  check('payroll CR 2500 17500', d(lineOf(pj, '2500').credit).eq(17500));

  // WPS SIF
  const wps = await raw('GET', `/hr/payroll/${runId}/wps`);
  const wpsLines = wps.text.split(/\r?\n/).filter(Boolean);
  check('WPS EDR header', wpsLines[0]?.startsWith('EDR,'), wpsLines[0]);
  check('WPS 2 EER lines', wpsLines.filter((l) => l.startsWith('EER,')).length === 2);

  // Leave: approve 5 days annual leave
  const lt = await call('POST', '/hr/leave-types', { code: 'AL', nameEn: 'Annual', nameAr: 'سنوية', daysPerYear: '30', isEncashable: true });
  check('create leave type', lt.status === 201);
  const b0 = (await call<any[]>('GET', `/hr/leaves/balances/${emp1}`)).data.find((b) => b.code === 'AL');
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + 4);
  const lr = await call('POST', '/hr/leaves/request', { employeeId: emp1, leaveTypeId: lt.data.id, startDate: today, endDate: end.toISOString().slice(0, 10) });
  check('leave request 5 days', lr.status === 201 && d(lr.data.days).eq(5), JSON.stringify(lr.data).slice(0, 200));
  const la = await call('POST', `/hr/leaves/${lr.data.id}/approve`);
  check('leave approved', la.data.status === 'approved');
  const b1 = (await call<any[]>('GET', `/hr/leaves/balances/${emp1}`)).data.find((b) => b.code === 'AL');
  check('leave balance reduced by 5', d(b0!.balance).minus(d(b1!.balance)).eq(5), `before=${b0!.balance} after=${b1!.balance}`);

  // End of service: 2 years × 21 days × 5000/30
  const eos = await call('POST', '/hr/eos/calculate', { employeeId: emp1 });
  check('calculate EOS', eos.status === 201, JSON.stringify(eos.data).slice(0, 200));
  const expected = new Decimal(2).times(21).times(new Decimal(5000).div(30));
  check('gratuity = 7000', d(eos.data.gratuityAmount).toDecimalPlaces(2).eq(expected.toDecimalPlaces(2)), `got ${eos.data.gratuityAmount}`);
  const eid = eos.data.id;
  await call('POST', `/hr/eos/${eid}/approve`);
  const ep = await call('POST', `/hr/eos/${eid}/pay`);
  check('pay EOS', ep.data.status === 'paid' && !!ep.data.journalEntryId);
  const ej = (await call('GET', `/accounting/journals/${ep.data.journalEntryId}`)).data;
  const total = d(eos.data.totalAmount);
  check('EOS DR 6300 total', d(lineOf(ej, '6300').debit).eq(total));
  check('EOS CR 2600 total', d(lineOf(ej, '2600').credit).eq(total));

  // Every journal balanced
  for (const id of [pay.data.journalEntryId, ep.data.journalEntryId]) {
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
