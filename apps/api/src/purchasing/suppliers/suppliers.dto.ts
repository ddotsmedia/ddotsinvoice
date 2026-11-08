import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../common/tenant';

export class SupplierDto {
  @Matches(/^[A-Za-z0-9-]{1,30}$/) code!: string;
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsOptional() @Matches(/^\d{15}$/, { message: 'TRN must be 15 digits' }) trn?: string;
  @IsOptional() @IsInt() @Min(0) @Max(365) paymentTerms?: number;
  @IsOptional() @IsUUID() defaultApAccountId?: string;
  @IsOptional() @Length(3, 3) currencyCode?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @IsObject() contactJson?: Record<string, unknown>;
}

export class CreateSupplierDto extends SupplierDto {}
export class UpdateSupplierDto extends PartialType(SupplierDto) {}
export class SupplierQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
