import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class LeaveTypeDto {
  @Matches(/^[A-Za-z0-9-]{1,20}$/) code!: string;
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsOptional() @Matches(AMT) daysPerYear?: string;
  @IsOptional() isEncashable?: boolean;
}

export class LeaveRequestDto {
  @IsUUID() employeeId!: string;
  @IsUUID() leaveTypeId!: string;
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class LeaveQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsString() status?: string;
}
