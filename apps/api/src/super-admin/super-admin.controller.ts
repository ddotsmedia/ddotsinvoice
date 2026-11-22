import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { SuperAdminService } from './super-admin.service';
import { BootstrapTenantAdminDto, ChangeRoleDto, SearchQueryDto, SuspendDto, UpdatePlatformSettingsDto } from './super-admin.dto';

@ApiTags('super-admin')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly svc: SuperAdminService) {}

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get('tenants')
  tenants(@Query() q: SearchQueryDto) {
    return this.svc.listTenants(q);
  }

  @Get('tenants/:id')
  tenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getTenant(id);
  }

  @Patch('tenants/:id/suspend')
  suspendTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.setTenantActive(id, false);
  }

  @Patch('tenants/:id/activate')
  activateTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.setTenantActive(id, true);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTenant(id);
  }

  @Post('tenants/:id/impersonate')
  impersonate(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.impersonate(id);
  }

  @Post('tenants/:id/bootstrap-admin')
  bootstrapAdmin(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BootstrapTenantAdminDto) {
    return this.svc.bootstrapTenantAdmin(id, dto);
  }

  @Get('companies')
  companies(@Query() q: SearchQueryDto) {
    return this.svc.listCompanies(q);
  }

  @Patch('companies/:id/suspend')
  suspendCompany(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SuspendDto) {
    return this.svc.setCompanyActive(id, !dto.suspended);
  }

  @Get('users')
  users(@Query() q: SearchQueryDto) {
    return this.svc.listUsers(q);
  }

  @Patch('users/:id/role')
  changeRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeRoleDto) {
    return this.svc.setUserRole(id, dto.role);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SuspendDto) {
    return this.svc.setUserSuspended(id, dto.suspended);
  }

  @Patch('users/:id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.resetUserPassword(id);
  }

  @Get('settings')
  settings() {
    return this.svc.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.svc.updateSettings(dto);
  }
}
