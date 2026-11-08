import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { BankAccountQueryDto, CreateBankAccountDto, StatementQueryDto, UpdateBankAccountDto } from './bank-accounts.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class BankAccountsController {
  constructor(private readonly banks: BankAccountsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateBankAccountDto) {
    return this.banks.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: BankAccountQueryDto) {
    return this.banks.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.banks.findOne(a, id);
  }

  @Patch(':id')
  update(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBankAccountDto) {
    return this.banks.update(a, id, dto);
  }

  @Get(':id/statement')
  statement(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Query() q: StatementQueryDto) {
    return this.banks.statement(a, id, q);
  }
}
