export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  COMPANY_ADMIN = 'company_admin',
  BRANCH_MANAGER = 'branch_manager',
  ACCOUNTANT = 'accountant',
  SALES = 'sales',
  PURCHASING = 'purchasing',
  WAREHOUSE = 'warehouse',
  HR_PAYROLL = 'hr_payroll',
  HR_MANAGER = 'hr_manager',
  PAYROLL_MANAGER = 'payroll_manager',
  VIEWER = 'viewer',
}

export enum Currency {
  AED = 'AED',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  SAR = 'SAR',
  QAR = 'QAR',
  KWD = 'KWD',
  BHD = 'BHD',
  OMR = 'OMR',
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AccessTokenPayload {
  sub: string;
  tenantId: string | null;
  companyId: string | null;
  role: UserRole;
}
