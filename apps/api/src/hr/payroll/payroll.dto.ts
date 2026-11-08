import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PageQueryDto } from '../../common/tenant';

export class GeneratePayrollDto {
  @IsInt() @Min(2000) @Max(2100) periodYear!: number;
  @IsInt() @Min(1) @Max(12) periodMonth!: number;
  @IsOptional() @IsUUID() branchId?: string;
}

export class PayrollQueryDto extends PageQueryDto {}
