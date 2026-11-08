import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchaseOrdersController } from './purchase-orders/po.controller';
import { PurchaseOrdersService } from './purchase-orders/po.service';
import { GoodsReceiptsController } from './goods-receipts/grn.controller';
import { GoodsReceiptsService } from './goods-receipts/grn.service';
import { SupplierInvoicesController } from './supplier-invoices/si.controller';
import { SupplierInvoicesService } from './supplier-invoices/si.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';

@Module({
  controllers: [SuppliersController, PurchaseOrdersController, GoodsReceiptsController, SupplierInvoicesController, InventoryController],
  providers: [SuppliersService, PurchaseOrdersService, GoodsReceiptsService, SupplierInvoicesService, InventoryService],
})
export class PurchasingModule {}
