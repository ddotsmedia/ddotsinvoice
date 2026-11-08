import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @IsString() @MaxLength(20) code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isHQ?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
