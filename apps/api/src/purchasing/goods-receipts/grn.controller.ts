import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { GoodsReceiptsService } from './grn.service';
import { CreateGrnDto, GrnQueryDto } from './grn.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing/goods-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.PURCHASING))
export class GoodsReceiptsController {
  constructor(private readonly grns: GoodsReceiptsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateGrnDto) {
    return this.grns.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: GrnQueryDto) {
    return this.grns.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.grns.findOne(a, id);
  }

  @Post(':id/post')
  post(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.grns.post(a, id);
  }
}
