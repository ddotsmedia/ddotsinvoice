import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { CurrentUser } from '../modules/auth/current-user.decorator';
import { PdcService } from './pdc.service';
import { CreatePdcDto, UpdatePdcStatusDto, PdcQueryDto } from './pdc.dto';

@ApiTags('pdc')
@ApiBearerAuth()
@Controller('pdc')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class PdcController {
  constructor(private readonly svc: PdcService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: PdcQueryDto) {
    return this.svc.list(actor, q);
  }

  @Get('summary')
  summary(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.summary(actor);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getById(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreatePdcDto) {
    return this.svc.create(actor, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePdcStatusDto,
  ) {
    return this.svc.updateStatus(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(actor, id);
  }
}
