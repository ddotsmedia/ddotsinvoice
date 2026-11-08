import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { InventoryService } from './inventory.service';
import { AdjustmentDto, BalanceQueryDto, ItemDto, MovementQueryDto, WarehouseDto } from './inventory.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller('purchasing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.PURCHASING))
export class InventoryController {
  constructor(private readonly inv: InventoryService) {}

  @Get('inventory/items')
  items(@CurrentUser() a: AccessTokenPayload) {
    return this.inv.listItems(a);
  }

  @Post('inventory/items')
  createItem(@CurrentUser() a: AccessTokenPayload, @Body() dto: ItemDto) {
    return this.inv.createItem(a, dto);
  }

  @Get('warehouses')
  warehouses(@CurrentUser() a: AccessTokenPayload) {
    return this.inv.listWarehouses(a);
  }

  @Post('warehouses')
  createWarehouse(@CurrentUser() a: AccessTokenPayload, @Body() dto: WarehouseDto) {
    return this.inv.createWarehouse(a, dto);
  }

  @Get('inventory/balances')
  balances(@CurrentUser() a: AccessTokenPayload, @Query() q: BalanceQueryDto) {
    return this.inv.balances(a, q);
  }

  @Get('inventory/movements')
  movements(@CurrentUser() a: AccessTokenPayload, @Query() q: MovementQueryDto) {
    return this.inv.movements(a, q);
  }

  @Post('inventory/adjustment')
  adjust(@CurrentUser() a: AccessTokenPayload, @Body() dto: AdjustmentDto) {
    return this.inv.adjustment(a, dto);
  }

  @Get('inventory/stock-report')
  report(@CurrentUser() a: AccessTokenPayload, @Query() q: BalanceQueryDto) {
    return this.inv.stockReport(a, q.warehouseId);
  }
}
