import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../common/tenant';

/** Roles a company admin may assign. tenant_admin and super_admin are never assignable from here. */
export const COMPANY_ROLES = [
  'company_admin', 'branch_manager', 'accountant', 'sales', 'purchasing', 'warehouse',
  'hr_payroll', 'hr_manager', 'payroll_manager', 'viewer',
] as const;

/** Roles whose permission set the company admin may customise. */
export const EDITABLE_PERMISSION_ROLES = ['accountant', 'viewer', 'hr_manager', 'payroll_manager'] as const;

export class InviteUserDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsEmail() email!: string;
  @IsIn(COMPANY_ROLES) role!: (typeof COMPANY_ROLES)[number];
}

export class ChangeUserRoleDto {
  @IsIn(COMPANY_ROLES) role!: (typeof COMPANY_ROLES)[number];
}

export class SuspendUserDto {
  @IsBoolean() suspended!: boolean;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @Matches(/^(\d{15})?$/, { message: 'TRN must be 15 digits' }) trn?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(500) addressAr?: string;
  @IsOptional() @IsString() @MaxLength(2000) logoUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) fiscalYearStartMonth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(365) defaultPaymentTerms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) defaultVatRate?: number;
  @IsOptional() @Matches(/^[A-Z0-9-]{1,10}$/, { message: 'Invoice prefix: 1-10 chars, A-Z 0-9 -' }) invoicePrefix?: string;
}

export class UpdateRolesDto {
  @IsIn(EDITABLE_PERMISSION_ROLES) role!: (typeof EDITABLE_PERMISSION_ROLES)[number];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @IsString({ each: true }) permissions!: string[];
}

export class AuditQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsString() @MaxLength(30) module?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
}
