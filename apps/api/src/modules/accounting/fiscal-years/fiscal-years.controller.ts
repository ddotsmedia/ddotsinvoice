import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './fiscal-years.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/fiscal-years')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class FiscalYearsController {
  constructor(private readonly years: FiscalYearsService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload) {
    return this.years.list(actor);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateFiscalYearDto) {
    return this.years.create(actor, dto);
  }

  @Patch(':id/close')
  @Roles(...rolesAtOrAbove(UserRole.COMPANY_ADMIN))
  close(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.years.close(actor, id);
  }
}
