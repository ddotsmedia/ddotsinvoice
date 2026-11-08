import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { Db, employees, leaveBalances, leaveRequests, leaveTypes, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { LeaveQueryDto, LeaveRequestDto, LeaveTypeDto } from './leave.dto';

const DAY = 86400000;

@Injectable()
export class LeaveService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [r] = await tx.select().from(leaveRequests).where(and(eq(leaveRequests.id, id), eq(leaveRequests.companyId, companyId))).limit(1);
    if (!r) throw new NotFoundException('Leave request not found');
    return r;
  }

  // Creates the year's balance row on first use: pro-rata accrual to current month
  private async ensureBalance(tx: Tx, tenantId: string, companyId: string, employeeId: string, leaveTypeId: string, year: number) {
    const [b] = await tx
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.leaveTypeId, leaveTypeId), eq(leaveBalances.year, year)))
      .limit(1);
    if (b) return b;
    const [lt] = await tx.select().from(leaveTypes).where(and(eq(leaveTypes.id, leaveTypeId), eq(leaveTypes.companyId, companyId))).limit(1);
    if (!lt) throw new NotFoundException('Leave type not found');
    const now = new Date();
    const months = year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;
    const accrued = M.div(M.mul(M.money(lt.daysPerYear ?? '0'), M.money(months)), M.money(12));
    const [row] = await tx
      .insert(leaveBalances)
      .values({ tenantId, companyId, employeeId, leaveTypeId, year, accrued: M.toDb(accrued), taken: '0', balance: M.toDb(accrued) })
      .returning();
    return row;
  }

  createType(actor: AccessTokenPayload, dto: LeaveTypeDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [row] = await tx
        .insert(leaveTypes)
        .values({ tenantId, companyId, code: dto.code, nameEn: dto.nameEn, nameAr: dto.nameAr, daysPerYear: dto.daysPerYear ?? '30', isEncashable: dto.isEncashable ?? true })
        .returning();
      return row;
    });
  }

  listTypes(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => tx.select().from(leaveTypes).where(eq(leaveTypes.companyId, companyId)));
  }

  balances(actor: AccessTokenPayload, employeeId: string) {
    const { tenantId, companyId } = this.scope(actor);
    const year = new Date().getUTCFullYear();
    return withTenant(this.db, tenantId, async (tx) => {
      const [emp] = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId))).limit(1);
      if (!emp) throw new NotFoundException('Employee not found');
      const types = await tx.select().from(leaveTypes).where(eq(leaveTypes.companyId, companyId));
      const out = [];
      for (const t of types) out.push({ code: t.code, ...(await this.ensureBalance(tx, tenantId, companyId, employeeId, t.id, year)) });
      return out;
    });
  }

  createRequest(actor: AccessTokenPayload, dto: LeaveRequestDto) {
    const { tenantId, companyId } = this.scope(actor);
    const days = M.money(Math.round((Date.parse(dto.endDate) - Date.parse(dto.startDate)) / DAY) + 1);
    if (days.lessThan(1)) throw new UnprocessableEntityException('End date must be on or after start date');
    return withTenant(this.db, tenantId, async (tx) => {
      const [emp] = await tx.select({ id: employees.id }).from(employees).where(and(eq(employees.id, dto.employeeId), eq(employees.companyId, companyId))).limit(1);
      if (!emp) throw new NotFoundException('Employee not found');
      const year = Number(dto.startDate.slice(0, 4));
      const bal = await this.ensureBalance(tx, tenantId, companyId, dto.employeeId, dto.leaveTypeId, year);
      if (M.money(bal.balance ?? '0').lessThan(days)) throw new UnprocessableEntityException('Insufficient leave balance');
      const [row] = await tx
        .insert(leaveRequests)
        .values({ tenantId, companyId, employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId, startDate: dto.startDate, endDate: dto.endDate, days: M.toDb(days), notes: dto.notes })
        .returning();
      return row;
    });
  }

  list(actor: AccessTokenPayload, q: LeaveQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(leaveRequests.companyId, companyId)];
    if (q.employeeId) conds.push(eq(leaveRequests.employeeId, q.employeeId));
    if (q.status) conds.push(eq(leaveRequests.status, q.status as 'pending' | 'approved' | 'rejected' | 'cancelled'));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(leaveRequests).where(where).orderBy(desc(leaveRequests.startDate)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(leaveRequests).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  // Approval consumes balance: taken += days, balance -= days
  approve(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'pending') throw new UnprocessableEntityException('Only pending requests can be approved');
      const year = Number(r.startDate.slice(0, 4));
      const bal = await this.ensureBalance(tx, tenantId, companyId, r.employeeId, r.leaveTypeId, year);
      const days = M.money(r.days);
      if (M.money(bal.balance ?? '0').lessThan(days)) throw new UnprocessableEntityException('Insufficient leave balance');
      await tx
        .update(leaveBalances)
        .set({ taken: M.toDb(M.add(M.money(bal.taken ?? '0'), days)), balance: M.toDb(M.sub(M.money(bal.balance ?? '0'), days)), updatedAt: new Date() })
        .where(eq(leaveBalances.id, bal.id));
      const [row] = await tx
        .update(leaveRequests)
        .set({ status: 'approved', approvedBy: actor.sub, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(leaveRequests.id, id))
        .returning();
      return row;
    });
  }

  reject(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'pending') throw new UnprocessableEntityException('Only pending requests can be rejected');
      const [row] = await tx.update(leaveRequests).set({ status: 'rejected', updatedAt: new Date() }).where(eq(leaveRequests.id, id)).returning();
      return row;
    });
  }
}
