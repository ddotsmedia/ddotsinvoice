export const ADMIN_ROLES = ['company_admin', 'tenant_admin'] as const;

export const COMPANY_ROLES = [
  'company_admin', 'branch_manager', 'accountant', 'sales', 'purchasing', 'warehouse',
  'hr_payroll', 'hr_manager', 'payroll_manager', 'viewer',
] as const;

export const EDITABLE_PERMISSION_ROLES = ['accountant', 'viewer', 'hr_manager', 'payroll_manager'] as const;

export const MODULES = ['invoicing', 'purchasing', 'payments', 'hr', 'payroll', 'reports', 'budgets', 'settings'] as const;

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  module: string | null;
  recordId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userEmail: string | null;
}

export const fullName = (u: { firstName?: string | null; lastName?: string | null }) =>
  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—';

export const shortJson = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  const s = JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};
