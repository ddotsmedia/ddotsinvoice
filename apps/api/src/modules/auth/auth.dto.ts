import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_REGEX = /\d/;
const PASSWORD_MSG = 'Password must be at least 8 characters and contain at least one number';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG }) password!: string;
}

export class RegisterTenantDto {
  @IsString() @MinLength(2) @MaxLength(255) tenantName!: string;
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG }) password!: string;
}
