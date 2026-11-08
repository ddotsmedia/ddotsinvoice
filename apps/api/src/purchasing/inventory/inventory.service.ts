import { randomUUID } from 'crypto';
import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, type SQL } from 'drizzle-orm';
import { accounts, Db, inventoryBalances, inventoryItems, inventoryMovements, Tx, warehouses, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount } from '../purchasing.util';
import { lockBalance, stockIn, stockOut } from './inventory.core';
import { AdjustmentDto, BalanceQueryDto, ItemDto, MovementQueryDto, WarehouseDto } from './inventory.dto';

@Injectable()
export class InventoryService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async assertAccount(tx: Tx, companyId: string, id: string) {
    const [a] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, id), eq(accounts.companyId, companyId))).limit(1);
    if (!a) throw new NotFoundException('Account not found');
  }

  async listItems(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(inventoryItems).where(eq(inventoryItems.companyId, companyId)).orderBy(asc(inventoryItems.code)),
    );
  }

  createItem(actor: AccessTokenPayload, dto: ItemDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.assertAccount(tx, companyId, dto.inventoryAccountId);
      await this.assertAccount(tx, companyId, dto.cogsAccountId);
      const [dup] = await tx.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.companyId, companyId), eq(inventoryItems.code, dto.code))).limit(1);
      if (dup) throw new ConflictException('Item code already exists');
      const [row] = await tx.insert(inventoryItems).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  listWarehouses(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(warehouses).where(eq(warehouses.companyId, companyId)).orderBy(asc(warehouses.code)),
    );
  }

  createWarehouse(actor: AccessTokenPayload, dto: WarehouseDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [dup] = await tx.select({ id: warehouses.id }).from(warehouses).where(and(eq(warehouses.companyId, companyId), eq(warehouses.code, dto.code))).limit(1);
      if (dup) throw new ConflictException('Warehouse code already exists');
      const [row] = await tx.insert(warehouses).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  balances(actor: AccessTokenPayload, q: BalanceQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(inventoryBalances.companyId, companyId)];
    if (q.itemId) conds.push(eq(inventoryBalances.itemId, q.itemId));
    if (q.warehouseId) conds.push(eq(inventoryBalances.warehouseId, q.warehouseId));
    return withTenant(this.db, tenantId, (tx) => tx.select().from(inventoryBalances).where(and(...conds)));
  }

  movements(actor: AccessTokenPayload, q: MovementQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(inventoryMovements.companyId, companyId)];
    if (q.itemId) conds.push(eq(inventoryMovements.itemId, q.itemId));
    if (q.warehouseId) conds.push(eq(inventoryMovements.warehouseId, q.warehouseId));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(inventoryMovements).where(where).orderBy(desc(inventoryMovements.createdAt)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(inventoryMovements).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  stockReport(actor: AccessTokenPayload, warehouseId?: string) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(inventoryBalances.companyId, companyId)];
    if (warehouseId) conds.push(eq(inventoryBalances.warehouseId, warehouseId));
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({
          itemId: inventoryItems.id,
          code: inventoryItems.code,
          nameEn: inventoryItems.nameEn,
          nameAr: inventoryItems.nameAr,
          warehouseId: inventoryBalances.warehouseId,
          qty: inventoryBalances.qty,
          avgCost: inventoryBalances.avgCost,
          totalValue: inventoryBalances.totalValue,
        })
        .from(inventoryBalances)
        .innerJoin(inventoryItems, eq(inventoryItems.id, inventoryBalances.itemId))
        .where(and(...conds))
        .orderBy(asc(inventoryItems.code));
      return rows;
    });
  }

  // Signed qty; positive = in (unitCost or current avg), negative = out (avg or FIFO cost)
  adjustment(actor: AccessTokenPayload, dto: AdjustmentDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, dto.itemId), eq(inventoryItems.companyId, companyId))).limit(1);
      if (!item) throw new NotFoundException('Inventory item not found');
      const qty = M.money(dto.qty);
      if (qty.isZero()) throw new UnprocessableEntityException('Adjustment quantity cannot be zero');
      const ref = { itemId: item.id, warehouseId: dto.warehouseId, refType: 'adjustment', refId: randomUUID(), date: dto.date, costMethod: item.costMethod };
      const ctx = { tenantId, companyId };
      const b = await lockBalance(tx, ctx, item.id, dto.warehouseId);

      let value: M.Money;
      let inbound = qty.greaterThan(0);
      if (inbound) {
        const unit = M.money(dto.unitCost ?? b.avgCost ?? '0');
        const r = await stockIn(tx, ctx, ref, { qty, unitCost: unit, type: 'adjustment_in' });
        value = M.mul(qty, unit);
        void r;
      } else {
        const abs = M.sub(M.money(0), qty);
        const r = await stockOut(tx, ctx, ref, { qty: abs, type: 'adjustment_out' });
        value = r.outCost;
      }

      let journalEntryId: string | null = null;
      if (!value.isZero()) {
        const inv = await ensureAccount(tx, tenantId, companyId, '1500', 'Inventory', 'asset');
        const adj = await ensureAccount(tx, tenantId, companyId, '5900', 'Inventory Adjustment', 'expense');
        const amt = M.toDb(value);
        journalEntryId = await postJournal(tx, {
          tenantId,
          companyId,
          date: dto.date,
          description: `Stock adjustment: ${dto.note ?? item.code}`,
          userId: actor.sub,
          lines: inbound
            ? [{ accountId: inv, debit: amt, credit: '0' }, { accountId: adj, debit: '0', credit: amt }]
            : [{ accountId: adj, debit: amt, credit: '0' }, { accountId: inv, debit: '0', credit: amt }],
        });
      }
      return { refId: ref.refId, journalEntryId, value: M.toDb(value) };
    });
  }
}
