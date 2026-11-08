import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { UserRole } from '@ddotsinvoice/shared';

export class InviteUserDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(100) firstName!: string;
  @IsString() @MaxLength(100) lastName!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() branchId?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateRoleDto {
  @IsEnum(UserRole) role!: UserRole;
}
