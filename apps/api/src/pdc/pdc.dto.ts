import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum PdcType { RECEIVED = 'received', ISSUED = 'issued' }
export enum PdcStatus {
  PENDING = 'pending', PRESENTED = 'presented', CLEARED = 'cleared',
  BOUNCED = 'bounced', CANCELLED = 'cancelled', RETURNED = 'returned',
}

export class CreatePdcDto {
  @IsEnum(PdcType) type!: PdcType;
  @IsString() chequeNumber!: string;
  @IsOptional() @IsString() bankName?: string;
  @Type(() => Number) @IsNumber() amount!: number;
  @IsOptional() @IsString() currency?: string;
  @IsDateString() dueDate!: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePdcStatusDto {
  @IsEnum(PdcStatus) status!: PdcStatus;
  @IsOptional() @IsDateString() presentedDate?: string;
  @IsOptional() @IsDateString() clearedDate?: string;
  @IsOptional() @IsDateString() bouncedDate?: string;
  @IsOptional() @IsString() bouncedReason?: string;
}

export class PdcQueryDto {
  @IsOptional() @IsEnum(PdcType) type?: PdcType;
  @IsOptional() @IsEnum(PdcStatus) status?: PdcStatus;
  @IsOptional() @IsString() dueDateFrom?: string;
  @IsOptional() @IsString() dueDateTo?: string;
  @IsOptional() @IsString() search?: string;
}
