import { IsBoolean, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@ddotsinvoice/shared';
import { PageQueryDto } from '../common/tenant';

const ROLES = Object.values(UserRole) as string[];

export class SearchQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class SuspendDto {
  @IsBoolean() suspended!: boolean;
}

export class ChangeRoleDto {
  @IsIn(ROLES) role!: UserRole;
}

export class UpdatePlatformSettingsDto {
  @IsOptional() @IsString() @MaxLength(255) platformName?: string;
  @IsOptional() @IsString() @MaxLength(2000) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(3) defaultCurrency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) defaultVatRate?: number;
  @IsOptional() @IsString() @MaxLength(255) smtpHost?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(65535) smtpPort?: number;
  @IsOptional() @IsString() @MaxLength(255) smtpUser?: string;
  @IsOptional() @IsString() @MaxLength(255) smtpPass?: string;
  @IsOptional() @IsBoolean() maintenanceMode?: boolean;
}

export class BootstrapTenantAdminDto {
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsEmail() @MaxLength(255) email!: string;
}
