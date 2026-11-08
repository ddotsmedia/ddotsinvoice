import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customers.dto';

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoicing/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.SALES))
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: CustomerQueryDto) {
    return this.customers.list(actor, q);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.getById(actor, id);
  }

  @Get(':id/statement')
  statement(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.getStatement(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateCustomerDto) {
    return this.customers.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.customers.deactivate(actor, id);
  }
}
