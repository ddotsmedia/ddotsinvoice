import { spawnSync } from 'node:child_process';

// Phase 9 smoke test: super admin panel + company admin panel + permissions/audit.
// Env: API (default http://localhost:4101), SA_EMAIL/SA_PASSWORD, CA_EMAIL/CA_PASSWORD (company_admin WITH a company),
// PG_CONTAINER (default ddotsinvoice-postgres-1).
const API = process.env.API ?? 'http://localhost:4101';
const SA_EMAIL = process.env.SA_EMAIL ?? 'sadmin@ddotsmedia.com';
const SA_PASS = process.env.SA_PASSWORD ?? 'SuperAdmin2026!';
const CA_EMAIL = process.env.CA_EMAIL ?? 'ca4@phase4.test';
const CA_PASS = process.env.CA_PASSWORD ?? 'Password123!';
const TENANT_ID = process.env.TENANT_ID ?? '11111111-1111-4111-8111-111111111111';
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

const jwtPayload = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));

async function login(email: string, password: string): Promise<string> {
  const r = await call<{ accessToken: string }>('POST', '/auth/login', undefined, { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: ${r.status}`);
  return r.data.accessToken;
}

async function main() {
  // Super admin
  const sa = await login(SA_EMAIL, SA_PASS);
  check('super admin login → JWT role=super_admin', jwtPayload(sa).role === 'super_admin');

  const stats = await call('GET', '/super-admin/stats', sa);
  const countFields = ['totalTenants', 'totalCompanies', 'totalUsers', 'totalInvoices', 'totalInvoiceValue'];
  check(
    'GET /super-admin/stats → 5 count fields present',
    stats.status === 200 && countFields.every((f) => f in stats.data),
    JSON.stringify(stats.status),
  );

  const tenants = await call('GET', '/super-admin/tenants', sa);
  check('GET /super-admin/tenants → items length>=1', tenants.status === 200 && Array.isArray(tenants.data.items) && tenants.data.items.length >= 1);

  const users = await call('GET', '/super-admin/users', sa);
  check('GET /super-admin/users → items array', users.status === 200 && Array.isArray(users.data.items));

  const imp = await call('POST', `/super-admin/tenants/${TENANT_ID}/impersonate`, sa);
  check('POST /super-admin/tenants/:id/impersonate → token, expiresIn=900', imp.status < 300 && typeof imp.data.accessToken === 'string' && imp.data.expiresIn === 900, String(imp.status));

  // Company admin
  const ca = await login(CA_EMAIL, CA_PASS);
  const ov = await call('GET', '/admin/overview', ca);
  check('company admin GET /admin/overview → 200', ov.status === 200, String(ov.status));

  const au = await call('GET', '/admin/users', ca);
  check('GET /admin/users → array with >=1 user', au.status === 200 && Array.isArray(au.data) && au.data.length >= 1);

  psql("delete from users where email = 'test@acme.test'"); // idempotent re-runs
  const inv = await call('POST', '/admin/users/invite', ca, { name: 'Test User', email: 'test@acme.test', role: 'viewer' });
  check('POST /admin/users/invite → 201', inv.status === 201, String(inv.status));

  const log = await call('GET', '/admin/audit-log', ca);
  const items: { action: string }[] = log.data?.items ?? [];
  check(
    'GET /admin/audit-log → invite action logged',
    log.status === 200 && Array.isArray(items) && items.some((i) => i.action === 'POST /admin/users/invite'),
    String(log.status),
  );

  const denied = await call('GET', '/super-admin/stats', ca);
  check('company admin GET /super-admin/stats → 403', denied.status === 403, String(denied.status));

  console.log(`\nPhase 9 smoke test passed (${step} checks)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
