import { ArrayMinSize, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class PoLineDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsString() @MaxLength(500) description!: string;
  @Matches(AMT) qty!: string;
  @Matches(AMT) unitPrice!: string;
  @IsOptional() @Matches(AMT) discount?: string;
  @IsOptional() @Matches(AMT) vatRate?: string;
}

export class CreatePoDto {
  @IsUUID() branchId!: string;
  @IsUUID() supplierId!: string;
  @IsUUID() fiscalYearId!: string;
  @Matches(DATE) date!: string;
  @IsOptional() @Matches(DATE) expectedDeliveryDate?: string;
  @IsOptional() @Length(3, 3) currencyCode?: string;
  @IsOptional() @Matches(AMT) exchangeRate?: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true }) @Type(() => PoLineDto) @ArrayMinSize(1) lines!: PoLineDto[];
}

export class PoQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
}
