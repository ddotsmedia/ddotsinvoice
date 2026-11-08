import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ACCOUNT_TYPES, AccountType, NormalBalance } from '../accounting.util';

export class CreateAccountDto {
  @IsString() @Matches(/^[0-9A-Za-z.-]{1,20}$/) code!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsIn(ACCOUNT_TYPES) type!: AccountType;
  @IsOptional() @IsIn(['debit', 'credit']) normalBalance?: NormalBalance;
  @IsOptional() @IsBoolean() isHeader?: boolean;
  @IsOptional() @IsString() description?: string;
}

export class UpdateAccountDto {
  @IsOptional() @Matches(/^[0-9A-Za-z.-]{1,20}$/) code?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @IsIn(ACCOUNT_TYPES) type?: AccountType;
  @IsOptional() @IsBoolean() isHeader?: boolean;
  @IsOptional() @IsString() description?: string;
}
