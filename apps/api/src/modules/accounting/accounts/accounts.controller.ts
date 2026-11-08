import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload) {
    return this.accounts.list(actor);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.getById(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateAccountDto) {
    return this.accounts.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.deactivate(actor, id);
  }
}
