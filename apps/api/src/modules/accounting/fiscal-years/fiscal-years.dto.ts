import { IsString, Matches, MaxLength } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateFiscalYearDto {
  @IsString() @MaxLength(50) name!: string;
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
}
