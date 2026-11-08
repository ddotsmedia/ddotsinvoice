import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SIGNED = /^-?\d{1,14}(\.\d{1,6})?$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class ItemDto {
  @Matches(/^[A-Za-z0-9-]{1,30}$/) code!: string;
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsString() @MaxLength(20) unit!: string;
  @IsOptional() @IsIn(['avco', 'fifo']) costMethod?: 'avco' | 'fifo';
  @IsUUID() inventoryAccountId!: string;
  @IsUUID() cogsAccountId!: string;
  @IsOptional() @Matches(AMT) reorderPoint?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class WarehouseDto {
  @Matches(/^[A-Za-z0-9-]{1,20}$/) code!: string;
  @IsString() nameEn!: string;
  @IsString() nameAr!: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class BalanceQueryDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
}

export class MovementQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() itemId?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
}

export class AdjustmentDto {
  @IsUUID() itemId!: string;
  @IsUUID() warehouseId!: string;
  @Matches(SIGNED) qty!: string; // +in / -out
  @IsOptional() @Matches(AMT) unitCost?: string; // for inbound adjustments
  @IsOptional() @IsString() @MaxLength(255) note?: string;
  @Matches(DATE) date!: string;
}
