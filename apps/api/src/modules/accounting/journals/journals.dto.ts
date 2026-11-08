import { ArrayMinSize, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PageQueryDto } from '../../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT = /^\d{1,14}(\.\d{1,6})?$/;
const RATE = /^\d{1,14}(\.\d{1,6})?$/;

export class JournalLineDto {
  @IsUUID() accountId!: string;
  @IsOptional() @Matches(AMOUNT) debit?: string;
  @IsOptional() @Matches(AMOUNT) credit?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class JournalDto {
  @Matches(DATE) date!: string;
  @IsString() @MaxLength(1000) description!: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @Length(3, 3) currency?: string;
  @IsOptional() @Matches(RATE) exchangeRate?: string;
  @ValidateNested({ each: true }) @Type(() => JournalLineDto) @ArrayMinSize(2) lines!: JournalLineDto[];
}

export class CreateJournalDto extends JournalDto {}
export class UpdateJournalDto extends PartialType(JournalDto) {}

export class JournalQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['draft', 'posted', 'reversed']) status?: 'draft' | 'posted' | 'reversed';
  @IsOptional() @Matches(DATE) dateFrom?: string;
  @IsOptional() @Matches(DATE) dateTo?: string;
  @IsOptional() @IsUUID() fiscalYearId?: string;
}
