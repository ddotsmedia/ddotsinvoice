import { ArrayMinSize, IsOptional, IsString, IsUUID, Matches, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class GrnLineDto {
  @IsOptional() @IsUUID() poLineId?: string;
  @IsOptional() @IsUUID() itemId?: string;
  @IsString() @MaxLength(500) description!: string;
  @Matches(AMT) qtyReceived!: string;
  @Matches(AMT) unitCost!: string;
  @IsOptional() @Matches(AMT) vatRate?: string;
  @IsUUID() warehouseId!: string;
}

export class CreateGrnDto {
  @IsUUID() branchId!: string;
  @IsUUID() supplierId!: string;
  @IsOptional() @IsUUID() poId?: string;
  @IsUUID() fiscalYearId!: string;
  @Matches(DATE) date!: string;
  @IsOptional() @IsString() notes?: string;
  @ValidateNested({ each: true }) @Type(() => GrnLineDto) @ArrayMinSize(1) lines!: GrnLineDto[];
}

export class GrnQueryDto extends PageQueryDto {
  @IsOptional() @IsString() status?: string;
}
