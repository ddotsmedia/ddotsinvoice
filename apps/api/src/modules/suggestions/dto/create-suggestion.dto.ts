import { IsEmail, IsIn, IsString, MaxLength, MinLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateSuggestionDto {
  @IsString() @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsIn(['Feature Request', 'Bug Report', 'UI/UX Improvement', 'Performance', 'Integration', 'Other']) category!: string;
  @IsIn(['low', 'medium', 'high']) @IsOptional() priority?: string;
  @IsString() @MaxLength(100) subject!: string;
  @IsString() @MinLength(20) @MaxLength(1000) description!: string;
  @IsBoolean() @IsOptional() wantsNotification?: boolean;
}
