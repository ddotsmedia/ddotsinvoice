import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { PurchaseOrdersService } from './po.service';
import { CreatePoDto, PoQueryDto } from './po.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing/purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.PURCHASING))
export class PurchaseOrdersController {
  constructor(private readonly pos: PurchaseOrdersService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreatePoDto) {
    return this.pos.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: PoQueryDto) {
    return this.pos.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.pos.findOne(a, id);
  }

  @Post(':id/submit')
  submit(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.pos.submit(a, id);
  }

  @Post(':id/approve')
  approve(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.pos.approve(a, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.pos.cancel(a, id);
  }
}
