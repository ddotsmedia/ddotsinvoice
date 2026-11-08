import { UserRole } from './types';

// Lower rank = more privilege
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 0,
  [UserRole.PLATFORM_ADMIN]: 0,
  [UserRole.TENANT_ADMIN]: 1,
  [UserRole.COMPANY_ADMIN]: 2,
  [UserRole.BRANCH_MANAGER]: 3,
  [UserRole.ACCOUNTANT]: 4,
  [UserRole.SALES]: 5,
  [UserRole.PURCHASING]: 5,
  [UserRole.WAREHOUSE]: 5,
  [UserRole.HR_PAYROLL]: 5,
  [UserRole.HR_MANAGER]: 5,
  [UserRole.PAYROLL_MANAGER]: 5,
  [UserRole.VIEWER]: 6,
};

// Roles at or above `min` (e.g. rolesAtOrAbove(UserRole.COMPANY_ADMIN) = "company_admin+")
export const rolesAtOrAbove = (min: UserRole): UserRole[] =>
  (Object.values(UserRole) as UserRole[]).filter((r) => ROLE_RANK[r] <= ROLE_RANK[min]);
