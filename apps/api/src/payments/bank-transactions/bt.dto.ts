import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^\d{1,14}(\.\d{1,6})?$/;

export class CreateBankTxDto {
  @IsUUID() bankAccountId!: string;
  @Matches(DATE) date!: string;
  @IsIn(['deposit', 'withdrawal', 'transfer', 'bank_charge', 'interest']) type!: 'deposit' | 'withdrawal' | 'transfer' | 'bank_charge' | 'interest';
  @Matches(AMT) amount!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
}

export class BankTxQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() bankAccountId?: string;
}
