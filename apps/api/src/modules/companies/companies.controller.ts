import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { rolesAtOrAbove, AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PageQueryDto } from '../../common/tenant';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './companies.dto';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.COMPANY_ADMIN))
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** TEMPORARY: remove after 403 investigation */
  @Get('debug-auth')
  debugAuth(@CurrentUser() actor: AccessTokenPayload) {
    const { rolesAtOrAbove } = require('@ddotsinvoice/shared');
    const allowed = rolesAtOrAbove(require('@ddotsinvoice/shared').UserRole.COMPANY_ADMIN);
    return {
      actorRole: actor?.role,
      actorTenantId: actor?.tenantId,
      actorCompanyId: actor?.companyId,
      actorSub: actor?.sub,
      allowedRoles: allowed,
      hasAccess: allowed.includes(actor?.role),
    };
  }

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: PageQueryDto) {
    return this.companies.list(actor, q);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateCompanyDto) {
    return this.companies.create(actor, dto);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.companies.get(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(...rolesAtOrAbove(UserRole.TENANT_ADMIN))
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.companies.remove(actor, id);
  }
}
