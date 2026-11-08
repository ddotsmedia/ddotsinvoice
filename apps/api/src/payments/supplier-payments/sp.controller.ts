import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { SupplierPaymentsService } from './sp.service';
import { CreateSupplierPaymentDto, SupplierPaymentQueryDto } from './sp.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/supplier-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class SupplierPaymentsController {
  constructor(private readonly payments: SupplierPaymentsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateSupplierPaymentDto) {
    return this.payments.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: SupplierPaymentQueryDto) {
    return this.payments.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(a, id);
  }

  @Post(':id/post')
  post(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.post(a, id);
  }

  @Post(':id/void')
  void(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.void(a, id);
  }
}
