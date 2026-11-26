import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
}

export class CreateFixedAssetDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsDateString() acquisitionDate!: string;
  @Type(() => Number) @IsNumber() acquisitionCost!: number;
  @IsOptional() @Type(() => Number) @IsNumber() residualValue?: number;
  @Type(() => Number) @IsNumber() @Min(1) usefulLifeMonths!: number;
  @IsEnum(DepreciationMethod) depreciationMethod!: DepreciationMethod;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsUUID() assetAccountId?: string;
  @IsOptional() @IsUUID() accumulatedDepreciationAccountId?: string;
  @IsOptional() @IsUUID() depreciationExpenseAccountId?: string;
}

export class UpdateFixedAssetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsUUID() assetAccountId?: string;
  @IsOptional() @IsUUID() accumulatedDepreciationAccountId?: string;
  @IsOptional() @IsUUID() depreciationExpenseAccountId?: string;
}

export class DisposeAssetDto {
  @IsDateString() disposalDate!: string;
  @Type(() => Number) @IsNumber() disposalValue!: number;
  @IsOptional() @IsString() disposalNotes?: string;
}

export class FixedAssetQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() search?: string;
}
