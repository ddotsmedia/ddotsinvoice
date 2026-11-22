import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

export class RegisterTenantDto {
  @IsString() @MinLength(2) @MaxLength(255) tenantName!: string;
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
