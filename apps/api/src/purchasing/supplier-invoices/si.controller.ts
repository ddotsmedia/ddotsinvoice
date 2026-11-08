import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { SupplierInvoicesService } from './si.service';
import { CreateSiDto, SiQueryDto } from './si.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing/supplier-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.PURCHASING))
export class SupplierInvoicesController {
  constructor(private readonly sis: SupplierInvoicesService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateSiDto) {
    return this.sis.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: SiQueryDto) {
    return this.sis.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.sis.findOne(a, id);
  }

  @Post(':id/post')
  post(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.sis.post(a, id);
  }

  @Get(':id/three-way-match')
  match(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.sis.threeWayMatch(a, id);
  }
}
