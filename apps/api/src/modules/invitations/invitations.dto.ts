import { IsEmail, IsIn, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { COMPANY_ROLES } from '../../admin/admin.dto';

export class CreateInvitationDto {
  @IsEmail() email!: string;
  // Same allow-list as admin invites: never super_admin / platform_admin / tenant_admin
  @IsIn(COMPANY_ROLES) role!: (typeof COMPANY_ROLES)[number];
}

export class AcceptInviteDto {
  @IsString() @Length(64, 64) token!: string;
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsString() @MinLength(8) @Matches(/\d/, { message: 'Password must be at least 8 characters and contain at least one number' }) password!: string;
}
