const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });

export const fmtAed = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : aed.format(Number(v));

export const fmtDate = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (v: string | null | undefined): string =>
  v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

export const ROLES = [
  'super_admin', 'tenant_admin', 'company_admin', 'branch_manager', 'accountant', 'sales', 'purchasing',
  'warehouse', 'hr_payroll', 'hr_manager', 'payroll_manager', 'viewer',
] as const;
