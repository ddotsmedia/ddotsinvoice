import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class EmployeeDto {
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsOptional() @IsString() @MaxLength(20) nationalId?: string;
  @IsOptional() @IsString() @MaxLength(20) passportNumber?: string;
  @IsOptional() @Length(2, 3) nationality?: string;
  @IsString() @MaxLength(255) jobTitle!: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @Matches(DATE) hireDate!: string;
  @IsOptional() @Matches(/^[0-9]{1,30}$/) bankAccountNumber?: string;
  @IsOptional() @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, { message: 'Invalid IBAN' }) ibanNumber?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() @MaxLength(20) routingCode?: string;
  @IsOptional() @IsString() @MaxLength(20) laborCardNumber?: string;
  @IsOptional() @IsString() @MaxLength(20) visaNumber?: string;
  @IsOptional() @Matches(DATE) visaExpiry?: string;
}

export class CreateEmployeeDto extends EmployeeDto {}
export class UpdateEmployeeDto extends PartialType(EmployeeDto) {}

export class EmployeeQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['active', 'terminated', 'on_leave', 'suspended']) status?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class TerminateDto {
  @Matches(DATE) terminationDate!: string;
}

export class SalaryStructureDto {
  @Matches(DATE) effectiveDate!: string;
  @Matches(AMT) basicSalary!: string;
  @IsOptional() @Matches(AMT) housingAllowance?: string;
  @IsOptional() @Matches(AMT) transportAllowance?: string;
  @IsOptional() @Matches(AMT) otherAllowances?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
