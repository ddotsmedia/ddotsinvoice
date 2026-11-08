import { IsBoolean, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../common/tenant';

export class BankAccountDto {
  @Matches(/^[A-Za-z0-9-]{1,20}$/) code!: string;
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsString() @MaxLength(255) bankName!: string;
  @IsString() @MaxLength(50) accountNumber!: string;
  @IsOptional() @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, { message: 'Invalid IBAN' }) iban?: string;
  @IsOptional() @Length(3, 3) currency?: string;
  @IsUUID() glAccountId!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateBankAccountDto extends BankAccountDto {}
export class UpdateBankAccountDto extends PartialType(BankAccountDto) {}
export class StatementQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}
export class BankAccountQueryDto extends PageQueryDto {}
