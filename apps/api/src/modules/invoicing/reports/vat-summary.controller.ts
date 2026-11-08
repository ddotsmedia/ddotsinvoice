import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { VatSummaryService } from './vat-summary.service';

class VatSummaryQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
}

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoicing/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class VatSummaryController {
  constructor(private readonly vat: VatSummaryService) {}

  @Get('vat-summary')
  summary(@CurrentUser() actor: AccessTokenPayload, @Query() q: VatSummaryQueryDto) {
    return this.vat.summary(actor, q);
  }
}
