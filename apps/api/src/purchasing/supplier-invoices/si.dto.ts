import { ArrayMinSize, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class SiLineDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsString() @MaxLength(500) description!: string;
  @Matches(AMT) qty!: string;
  @Matches(AMT) unitPrice!: string;
  @IsOptional() @Matches(AMT) vatRate?: string;
}

export class CreateSiDto {
  @IsUUID() branchId!: string;
  @IsUUID() supplierId!: string;
  @IsOptional() @IsUUID() grnId?: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsUUID() fiscalYearId!: string;
  @IsOptional() @IsString() @Length(1, 50) supplierRef?: string;
  @Matches(DATE) date!: string;
  @Matches(DATE) dueDate!: string;
  @ValidateNested({ each: true }) @Type(() => SiLineDto) @ArrayMinSize(1) lines!: SiLineDto[];
}

export class SiQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
}
