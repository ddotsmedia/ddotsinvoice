import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { ReconciliationsService } from './rec.service';
import { CreateReconciliationDto, ReconciliationQueryDto } from './rec.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/reconciliations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class ReconciliationsController {
  constructor(private readonly recs: ReconciliationsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateReconciliationDto) {
    return this.recs.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: ReconciliationQueryDto) {
    return this.recs.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.recs.findOne(a, id);
  }

  @Post(':id/close')
  close(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.recs.close(a, id);
  }

  @Get(':id/summary')
  summary(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.recs.summary(a, id);
  }
}
