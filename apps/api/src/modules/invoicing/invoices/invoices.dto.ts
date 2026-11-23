import {
  ArrayMinSize, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/tenant';
import { PAYMENT_TERMS } from '../customers/customers.dto';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT = /^\d{1,14}(\.\d{1,6})?$/;
const PCT = /^\d{1,3}(\.\d{1,2})?$/;

export class InvoiceLineDto {
  @IsString() @MaxLength(500) description!: string;
  @IsOptional() @IsString() @MaxLength(500) descriptionAr?: string;
  @Matches(AMOUNT) quantity!: string;
  @Matches(AMOUNT) unitPrice!: string;
  @IsOptional() @Matches(PCT) discountPct?: string;
  @IsOptional() @IsIn(['standard', 'zero_rated', 'exempt']) vatType?: 'standard' | 'zero_rated' | 'exempt';
  @IsOptional() @IsUUID() revenueAccountId?: string;
}

export class InvoiceDto {
  @IsUUID() customerId!: string;
  @IsOptional() @IsBoolean() isRecurring?: boolean;
  @IsOptional() @IsIn(['weekly', 'monthly', 'quarterly']) recurrenceInterval?: 'weekly' | 'monthly' | 'quarterly';
  @Matches(DATE) date!: string;
  @IsOptional() @IsInt() @IsIn(PAYMENT_TERMS) paymentTerms?: number;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @Length(3, 3) currency?: string;
  @IsOptional() @Matches(AMOUNT) exchangeRate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() notesAr?: string;
  @IsOptional() @IsString() termsAndConditions?: string;
  @ValidateNested({ each: true }) @Type(() => InvoiceLineDto) @ArrayMinSize(1) lines!: InvoiceLineDto[];
}

export class CreateInvoiceDto extends InvoiceDto {
  @IsIn(['quote', 'invoice']) type!: 'quote' | 'invoice';
}

export class UpdateInvoiceDto extends PartialType(InvoiceDto) {}

export class CreditNoteDto {
  @IsOptional() @Matches(DATE) date?: string;
  @IsOptional() @ValidateNested({ each: true }) @Type(() => InvoiceLineDto) @ArrayMinSize(1) lines?: InvoiceLineDto[];
}

export class SendEmailDto {
  @IsOptional() @IsString() to?: string;
}

export class BulkActionDto {
  @IsUUID('all', { each: true }) @ArrayMinSize(1) ids!: string[];
  @IsIn(['mark_sent']) action!: 'mark_sent';
}

export class BulkDeleteDto {
  @IsUUID('all', { each: true }) @ArrayMinSize(1) ids!: string[];
}

export class InvoiceQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['quote', 'invoice', 'credit_note']) type?: 'quote' | 'invoice' | 'credit_note';
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
}
