import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PageQueryDto } from '../../common/tenant';

export class DepartmentDto {
  @Matches(/^[A-Za-z0-9-]{1,20}$/) code!: string;
  @IsString() @MaxLength(255) nameEn!: string;
  @IsString() @MaxLength(255) nameAr!: string;
  @IsOptional() @IsUUID() managerId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateDepartmentDto extends DepartmentDto {}
export class UpdateDepartmentDto extends PartialType(DepartmentDto) {}
export class DepartmentQueryDto extends PageQueryDto {}
