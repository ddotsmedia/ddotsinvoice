import { spawnSync } from 'node:child_process';

// Phase 8 smoke test. Env: API (default http://localhost:4101), SMOKE_EMAIL/SMOKE_PASSWORD (company_admin, tenant A)
const API = process.env.API ?? 'http://localhost:4101';
const EMAIL = process.env.SMOKE_EMAIL!;
const PASS = process.env.SMOKE_PASSWORD ?? 'Password123!';
const PG = process.env.PG_CONTAINER ?? 'ddotsinvoice-postgres-1';
let step = 0;

const check = (name: string, ok: boolean, info = '') => {
  step++;
  if (!ok) {
    console.log(`✗ ${step} ${name} ${info}`);
    process.exit(1);
  }
  console.log(`✓ ${step} ${name}`);
};

async function call<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : undefined };
}

const psql = (sql: string) => {
  const r = spawnSync('docker', ['exec', PG, 'psql', '-U', 'ddots', '-d', 'ddotsinvoice', '-At', '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
};

async function main() {
  const health = await fetch(API + '/health');
  check('GET /health 200', health.status === 200);

  // Tenant B: separate tenant, company and admin
  const tenantA = (await call<{ accessToken: string }>('POST', '/auth/login', undefined, { email: EMAIL, password: PASS })).data.accessToken;
  const bTenant = '22222222-2222-4222-8222-222222222222';
  const bEmail = `tenantb${Date.now()}@ph8.test`;
  psql(`INSERT INTO tenants (id, slug, name) VALUES ('${bTenant}', 'tenant-b-${Date.now()}', 'Tenant B') ON CONFLICT DO NOTHING`);
  psql(`INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id) SELECT '${bEmail}', password_hash, 'B', 'Admin', 'tenant_admin', '${bTenant}' FROM users WHERE email='${EMAIL}'`);
  const bTok0 = (await call<{ accessToken: string }>('POST', '/auth/login', undefined, { email: bEmail, password: PASS })).data.accessToken;
  const bCo = (await call('POST', '/companies', bTok0, { name: 'Tenant B Co', currency: 'AED' })).data.id;
  const bAdmin = `bcompany${Date.now()}@ph8.test`;
  psql(`INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id, company_id) SELECT '${bAdmin}', password_hash, 'B', 'Co', 'company_admin', '${bTenant}', '${bCo}' FROM users WHERE email='${EMAIL}'`);
  const bTok = (await call<{ accessToken: string }>('POST', '/auth/login', undefined, { email: bAdmin, password: PASS })).data.accessToken;

  const aList = await call<{ total: number }>('GET', '/invoicing/invoices?limit=100', tenantA);
  const bList = await call<{ total: number; items: unknown[] }>('GET', '/invoicing/invoices?limit=100', bTok);
  check('tenant A list reachable', aList.status === 200, JSON.stringify(aList.data).slice(0, 120));
  check('tenant B sees 0 invoices of A', bList.status === 200 && bList.data.total === 0 && bList.data.items.length === 0, `total=${bList.data.total}`);

  // Regression: dashboard KPIs
  const d = (await call('GET', `/reports/dashboard?fromDate=${new Date().getUTCFullYear()}-01-01&toDate=${new Date().toISOString().slice(0, 10)}`, tenantA)).data;
  const kpis = ['totalRevenue', 'totalExpenses', 'netProfit', 'outstandingReceivables', 'outstandingPayables', 'cashBalance'];
  check('dashboard has 6 KPIs', kpis.every((k) => d[k] !== undefined));

  // Typecheck
  const tc = spawnSync('pnpm', ['typecheck'], { encoding: 'utf8', shell: true, cwd: process.cwd() });
  check('pnpm typecheck exit 0', tc.status === 0, `status=${tc.status}`);

  // Audit: no critical vulnerabilities
  const au = spawnSync('pnpm', ['audit', '--json'], { encoding: 'utf8', shell: true, cwd: process.cwd() });
  const audit = JSON.parse(au.stdout || '{}');
  check('audit critical = 0', (audit.metadata?.vulnerabilities?.critical ?? -1) === 0, `critical=${audit.metadata?.vulnerabilities?.critical}`);
  console.log('PASS');
}

main().catch((e) => {
  console.log(`✗ ${step} error ${e}`);
  process.exit(1);
});
