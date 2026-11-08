import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { ReportsService } from './reports.service';

class TrialBalanceQueryDto {
  @IsUUID() fiscalYearId!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) asOf?: string;
}

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('trial-balance')
  trialBalance(@CurrentUser() actor: AccessTokenPayload, @Query() q: TrialBalanceQueryDto) {
    return this.reports.trialBalance(actor, q.fiscalYearId, q.asOf ?? new Date().toISOString().slice(0, 10));
  }
}
