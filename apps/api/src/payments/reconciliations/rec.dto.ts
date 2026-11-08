import { IsOptional, IsUUID, Matches } from 'class-validator';
import { PageQueryDto } from '../../common/tenant';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMT = /^-?\d{1,14}(\.\d{1,6})?$/;

export class CreateReconciliationDto {
  @IsUUID() bankAccountId!: string;
  @Matches(DATE) statementDate!: string;
  @Matches(AMT) openingBalance!: string;
  @Matches(AMT) closingBalance!: string;
}

export class ReconciliationQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() bankAccountId?: string;
}
