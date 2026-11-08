import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { accounts, customers, Db, invoices, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customers.dto';

const OPEN_STATUSES = ['posted', 'paid', 'partially_paid', 'overdue'] as const;
const TRN = /^\d{15}$/;
const DAY = 86400000;

@Injectable()
export class CustomersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private checkTrn(trn?: string): void {
    if (trn && !TRN.test(trn)) throw new UnprocessableEntityException('TRN must be 15 digits');
  }

  private async checkAccount(tx: Tx, companyId: string, accountId?: string): Promise<void> {
    if (!accountId) return;
    const [a] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, companyId)))
      .limit(1);
    if (!a) throw new NotFoundException('AR account not found');
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [c] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId), isNull(customers.deletedAt)))
      .limit(1);
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  // Outstanding balance per customer (open invoices only)
  private async balances(tx: Tx, companyId: string, ids?: string[]) {
    const conds: SQL[] = [
      eq(invoices.companyId, companyId),
      eq(invoices.type, 'invoice'),
      inArray(invoices.status, [...OPEN_STATUSES]),
    ];
    if (ids) conds.push(inArray(invoices.customerId, ids));
    const rows = await tx
      .select({ customerId: invoices.customerId, due: sql<string>`coalesce(sum(${invoices.balanceDue}),0)` })
      .from(invoices)
      .where(and(...conds))
      .groupBy(invoices.customerId);
    return new Map(rows.map((r) => [r.customerId, r.due]));
  }

  list(actor: AccessTokenPayload, q: CustomerQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(customers.companyId, companyId), isNull(customers.deletedAt)];
    if (q.active) conds.push(eq(customers.isActive, q.active === 'true'));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(ilike(customers.name, s), ilike(customers.trn, s))!);
    }
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx
        .select()
        .from(customers)
        .where(where)
        .orderBy(customers.name)
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(customers).where(where);
      const bal = await this.balances(tx, companyId, items.map((i) => i.id));
      return {
        items: items.map((i) => ({ ...i, balance: bal.get(i.id) ?? '0' })),
        total,
        page: q.page,
        limit: q.limit,
      };
    });
  }

  getById(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const c = await this.find(tx, companyId, id);
      const [{ open }] = await tx
        .select({ open: count() })
        .from(invoices)
        .where(
          and(eq(invoices.customerId, id), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_STATUSES])),
        );
      const bal = await this.balances(tx, companyId, [id]);
      return { ...c, openInvoices: open, balance: bal.get(id) ?? '0' };
    });
  }

  create(actor: AccessTokenPayload, dto: CreateCustomerDto) {
    const { tenantId, companyId } = this.scope(actor);
    this.checkTrn(dto.trn);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.checkAccount(tx, companyId, dto.accountId);
      const [row] = await tx.insert(customers).values({ ...dto, tenantId, companyId }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateCustomerDto) {
    const { tenantId, companyId } = this.scope(actor);
    this.checkTrn(dto.trn);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      await this.checkAccount(tx, companyId, dto.accountId);
      const [row] = await tx
        .update(customers)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return row;
    });
  }

  // Soft delete
  deactivate(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const [row] = await tx
        .update(customers)
        .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return row;
    });
  }

  // Customer statement with aging buckets by days overdue (today - due date)
  getStatement(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const c = await this.find(tx, companyId, id);
      const rows = await tx
        .select()
        .from(invoices)
        .where(
          and(eq(invoices.customerId, id), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_STATUSES])),
        )
        .orderBy(invoices.date);

      const today = Date.parse(new Date().toISOString().slice(0, 10));
      const aging = { current: M.money(0), days30: M.money(0), days60: M.money(0), days90: M.money(0), over90: M.money(0) };
      let outstanding = M.money(0);
      const list = rows.map((r) => {
        const bal = M.money(r.balanceDue);
        outstanding = M.add(outstanding, bal);
        const due = Date.parse(r.dueDate ?? r.date);
        const days = Math.floor((today - due) / DAY);
        const bucket: keyof typeof aging =
          days <= 0 ? 'current' : days <= 30 ? 'days30' : days <= 60 ? 'days60' : days <= 90 ? 'days90' : 'over90';
        aging[bucket] = M.add(aging[bucket], bal);
        return {
          number: r.number,
          date: r.date,
          dueDate: r.dueDate,
          total: r.total,
          paidAmount: r.paidAmount,
          balanceDue: r.balanceDue,
          status: r.status,
        };
      });
      return {
        customer: c,
        invoices: list,
        totalOutstanding: M.toDb(outstanding),
        aging: Object.fromEntries(Object.entries(aging).map(([k, v]) => [k, M.toDb(v)])),
      };
    });
  }
}
