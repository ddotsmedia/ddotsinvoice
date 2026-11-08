import { IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class AllocationDto {
  @IsUUID() invoiceId!: string;
  @Matches(AMT) allocatedAmount!: string;
}

export class CreateCustomerPaymentDto {
  @IsUUID() customerId!: string;
  @IsUUID() branchId!: string;
  @Matches(DATE) date!: string;
  @Matches(AMT) amount!: string;
  @IsOptional() @Length(3, 3) currencyCode?: string;
  @IsOptional() @Matches(AMT) exchangeRate?: string;
  @IsIn(['cash', 'cheque', 'bank_transfer', 'card']) paymentMethod!: 'cash' | 'cheque' | 'bank_transfer' | 'card';
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @ValidateNested({ each: true }) @Type(() => AllocationDto) allocations?: AllocationDto[];
}

export class CustomerPaymentQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
}
