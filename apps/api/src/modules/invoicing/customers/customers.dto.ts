import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/tenant';

export const PAYMENT_TERMS = [0, 15, 30, 60, 90] as const;
const TRN = /^\d{15}$/;

export class CustomerDto {
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @Matches(TRN, { message: 'TRN must be 15 digits' }) trn?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() addressAr?: string;
  @IsOptional() @IsIn(PAYMENT_TERMS) paymentTerms?: number;
  @IsOptional() @Matches(/^\d{1,14}(\.\d{1,6})?$/) creditLimit?: string;
  @IsOptional() @Length(3, 3) currency?: string;
  @IsOptional() @IsUUID() accountId?: string;
}

export class CreateCustomerDto extends CustomerDto {}
export class UpdateCustomerDto extends PartialType(CustomerDto) {}

export class CustomerQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['true', 'false']) active?: 'true' | 'false';
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
