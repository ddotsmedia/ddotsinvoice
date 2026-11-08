import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './suppliers.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing/suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.PURCHASING))
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: SupplierQueryDto) {
    return this.suppliers.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.findOne(a, id);
  }

  @Patch(':id')
  update(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(a, id, dto);
  }
}
