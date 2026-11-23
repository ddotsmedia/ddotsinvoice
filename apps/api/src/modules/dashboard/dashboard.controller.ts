import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.VIEWER))
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('kpis')
  kpis(
    @CurrentUser() actor: AccessTokenPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboard.kpis(actor, from, to);
  }
}
