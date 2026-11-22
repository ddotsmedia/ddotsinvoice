import { PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Currency } from '@ddotsinvoice/shared';

export class CreateCompanyDto {
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(255) nameAr?: string;
  @IsOptional() @IsString() @MaxLength(15) trn?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() addressAr?: string;
  @IsOptional() @IsEnum(Currency) currency?: Currency;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}
