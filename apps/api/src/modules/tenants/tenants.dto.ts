import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString() @Matches(/^[a-z0-9-]{2,100}$/) slug!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(50) plan?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
