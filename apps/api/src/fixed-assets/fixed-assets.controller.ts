import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../modules/auth/jwt-auth.guard';
import { Roles } from '../modules/auth/roles.decorator';
import { RolesGuard } from '../modules/auth/roles.guard';
import { CurrentUser } from '../modules/auth/current-user.decorator';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto, UpdateFixedAssetDto, DisposeAssetDto, FixedAssetQueryDto } from './fixed-assets.dto';

@ApiTags('fixed-assets')
@ApiBearerAuth()
@Controller('fixed-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class FixedAssetsController {
  constructor(private readonly svc: FixedAssetsService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: FixedAssetQueryDto) {
    return this.svc.list(actor, q);
  }

  @Get('categories')
  categories(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.categories(actor);
  }

  @Get('summary')
  summary(@CurrentUser() actor: AccessTokenPayload) {
    return this.svc.summary(actor);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getById(actor, id);
  }

  @Get(':id/depreciation-schedule')
  schedule(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.depreciationSchedule(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateFixedAssetDto) {
    return this.svc.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFixedAssetDto,
  ) {
    return this.svc.update(actor, id, dto);
  }

  @Post(':id/dispose')
  dispose(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisposeAssetDto,
  ) {
    return this.svc.dispose(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(actor, id);
  }
}
