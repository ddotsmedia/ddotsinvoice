import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { CurrentUser } from '../modules/auth/current-user.decorator';
import { RequirePermission } from '../common/guards/permissions.guard';
import { AdminService } from './admin.service';
import { AuditQueryDto, ChangeUserRoleDto, InviteUserDto, SuspendUserDto, UpdateCompanyDto, UpdateRolesDto } from './admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.TENANT_ADMIN)
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('overview')
  @RequirePermission('reports:view')
  overview(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.overview(actor);
  }

  @Get('users')
  @RequirePermission('settings:view')
  users(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.listUsers(actor);
  }

  @Post('users/invite')
  @RequirePermission('settings:create')
  invite(@CurrentUser() actor: AccessTokenPayload, @Body() dto: InviteUserDto) {
    return this.svc.invite(actor, dto);
  }

  @Patch('users/:id/role')
  @RequirePermission('settings:edit')
  changeRole(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeUserRoleDto) {
    return this.svc.changeRole(actor, id, dto);
  }

  @Patch('users/:id/suspend')
  @RequirePermission('settings:edit')
  suspend(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SuspendUserDto) {
    return this.svc.setSuspended(actor, id, dto.suspended);
  }

  @Delete('users/:id')
  @RequirePermission('settings:delete')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(actor, id);
  }

  @Get('company')
  @RequirePermission('settings:view')
  company(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.getCompany(actor);
  }

  @Patch('company/:id')
  @RequirePermission('settings:edit')
  updateCompany(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompanyDto) {
    return this.svc.updateCompany(actor, id, dto);
  }

  @Get('roles')
  @RequirePermission('settings:view')
  roles(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.roles(actor);
  }

  @Patch('roles')
  @RequirePermission('settings:edit')
  updateRoles(@CurrentUser() actor: AccessTokenPayload, @Body() dto: UpdateRolesDto) {
    return this.svc.updateRoles(actor, dto);
  }

  @Get('audit-log')
  @RequirePermission('settings:view')
  auditLog(@CurrentUser() actor: AccessTokenPayload, @Query() q: AuditQueryDto) {
    return this.svc.auditLog(actor, q);
  }
}
