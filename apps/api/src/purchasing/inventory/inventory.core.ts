import { UnprocessableEntityException } from '@nestjs/common';
import { and, asc, eq, gt } from 'drizzle-orm';
import { inventoryBalances, inventoryLots, inventoryMovements, Tx } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';

export interface StockCtx { tenantId: string; companyId: string }
export interface StockRef { itemId: string; warehouseId: string; refType: string; refId: string; date: string; costMethod: 'fifo' | 'avco' }

// Upsert then row-lock the balance row for item+warehouse
export async function lockBalance(tx: Tx, c: StockCtx, itemId: string, warehouseId: string) {
  await tx
    .insert(inventoryBalances)
    .values({ tenantId: c.tenantId, companyId: c.companyId, itemId, warehouseId, qty: '0', avgCost: '0', totalValue: '0' })
    .onConflictDoNothing({
      target: [inventoryBalances.tenantId, inventoryBalances.companyId, inventoryBalances.itemId, inventoryBalances.warehouseId],
    });
  const [b] = await tx
    .select()
    .from(inventoryBalances)
    .where(and(eq(inventoryBalances.companyId, c.companyId), eq(inventoryBalances.itemId, itemId), eq(inventoryBalances.warehouseId, warehouseId)))
    .for('update');
  return b;
}

// Receive stock: qty up, value += qty*unitCost, avg = value/qty (AVCO formula); FIFO also writes a lot
export async function stockIn(
  tx: Tx,
  c: StockCtx,
  r: StockRef,
  p: { qty: M.Money; unitCost: M.Money; type: 'grn_in' | 'adjustment_in'; grnLineId?: string | null },
): Promise<{ before: M.Money; after: M.Money; avg: M.Money; value: M.Money }> {
  const b = await lockBalance(tx, c, r.itemId, r.warehouseId);
  const before = M.money(b.qty ?? '0');
  const after = M.add(before, p.qty);
  const value = M.add(M.money(b.totalValue ?? '0'), M.mul(p.qty, p.unitCost));
  const avg = after.isZero() ? M.money(0) : M.div(value, after);
  await tx
    .update(inventoryBalances)
    .set({ qty: M.toDb(after), avgCost: M.toDb(avg), totalValue: M.toDb(value), lastMovedAt: new Date() })
    .where(eq(inventoryBalances.id, b.id));
  if (r.costMethod === 'fifo') {
    await tx.insert(inventoryLots).values({
      tenantId: c.tenantId,
      companyId: c.companyId,
      itemId: r.itemId,
      warehouseId: r.warehouseId,
      grnLineId: p.grnLineId ?? null,
      originalQty: M.toDb(p.qty),
      remainingQty: M.toDb(p.qty),
      unitCost: M.toDb(p.unitCost),
      receivedDate: r.date,
    });
  }
  await tx.insert(inventoryMovements).values({
    tenantId: c.tenantId,
    companyId: c.companyId,
    itemId: r.itemId,
    warehouseId: r.warehouseId,
    type: p.type,
    refType: r.refType,
    refId: r.refId,
    date: r.date,
    qty: M.toDb(p.qty),
    unitCost: M.toDb(p.unitCost),
    totalCost: M.toDb(M.mul(p.qty, p.unitCost)),
    qtyBefore: M.toDb(before),
    qtyAfter: M.toDb(after),
  });
  return { before, after, avg, value };
}

// Issue stock: returns cost of goods issued (FIFO consumes lots oldest first; AVCO uses average)
export async function stockOut(
  tx: Tx,
  c: StockCtx,
  r: StockRef,
  p: { qty: M.Money; type: "adjustment_out" },
): Promise<{ outCost: M.Money; after: M.Money }> {
  const b = await lockBalance(tx, c, r.itemId, r.warehouseId);
  const before = M.money(b.qty ?? '0');
  if (before.lessThan(p.qty)) throw new UnprocessableEntityException('Insufficient stock');
  const curValue = M.money(b.totalValue ?? '0');
  const avgNow = M.money(b.avgCost ?? '0');

  let outCost = M.money(0);
  if (r.costMethod === 'fifo') {
    const lots = await tx
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.companyId, c.companyId), eq(inventoryLots.itemId, r.itemId), eq(inventoryLots.warehouseId, r.warehouseId), gt(inventoryLots.remainingQty, '0')))
      .orderBy(asc(inventoryLots.receivedDate), asc(inventoryLots.createdAt))
      .for('update');
    let remaining = p.qty;
    for (const lot of lots) {
      if (remaining.isZero()) break;
      const avail = M.money(lot.remainingQty);
      const take = avail.lessThan(remaining) ? avail : remaining;
      outCost = M.add(outCost, M.mul(take, M.money(lot.unitCost)));
      remaining = M.sub(remaining, take);
      await tx.update(inventoryLots).set({ remainingQty: M.toDb(M.sub(avail, take)), updatedAt: new Date() }).where(eq(inventoryLots.id, lot.id));
    }
    if (!remaining.isZero()) outCost = M.add(outCost, M.mul(remaining, avgNow)); // untracked stock at avg
  } else {
    outCost = M.mul(p.qty, avgNow);
  }

  const after = M.sub(before, p.qty);
  const value = M.sub(curValue, outCost);
  const avg = after.isZero() ? avgNow : M.div(value, after);
  await tx
    .update(inventoryBalances)
    .set({ qty: M.toDb(after), avgCost: M.toDb(avg), totalValue: M.toDb(value), lastMovedAt: new Date() })
    .where(eq(inventoryBalances.id, b.id));
  const negQty = M.sub(M.money(0), p.qty);
  await tx.insert(inventoryMovements).values({
    tenantId: c.tenantId,
    companyId: c.companyId,
    itemId: r.itemId,
    warehouseId: r.warehouseId,
    type: p.type,
    refType: r.refType,
    refId: r.refId,
    date: r.date,
    qty: M.toDb(negQty),
    unitCost: M.toDb(p.qty.isZero() ? M.money(0) : M.div(outCost, p.qty)),
    totalCost: M.toDb(M.sub(M.money(0), outCost)),
    qtyBefore: M.toDb(before),
    qtyAfter: M.toDb(after),
  });
  return { outCost, after };
}
