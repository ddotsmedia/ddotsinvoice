import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { Db, employees, endOfService, leaveBalances, leaveTypes, salaryStructures, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount } from '../../purchasing/purchasing.util';
import { completedYears, gratuityDays } from '../hr.util';

@Injectable()
export class EndOfServiceService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [e] = await tx.select().from(endOfService).where(and(eq(endOfService.id, id), eq(endOfService.companyId, companyId))).limit(1);
    if (!e) throw new NotFoundException('End of service record not found');
    return e;
  }

  // Gratuity (UAE): 21 days/yr first 5 yrs, 30 days/yr after, on last basic / 30; plus encashable leave
  calculate(actor: AccessTokenPayload, employeeId: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [emp] = await tx.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, companyId))).limit(1);
      if (!emp) throw new NotFoundException('Employee not found');
      const [s] = await tx
        .select()
        .from(salaryStructures)
        .where(and(eq(salaryStructures.employeeId, employeeId), eq(salaryStructures.isActive, true)))
        .orderBy(desc(salaryStructures.effectiveDate))
        .limit(1);
      if (!s) throw new UnprocessableEntityException('No active salary structure');

      const termDate = emp.terminationDate ?? new Date().toISOString().slice(0, 10);
      const years = completedYears(emp.hireDate, termDate);
      const basic = M.money(s.basicSalary);
      const daily = M.div(basic, M.money(30));
      const gratuity = M.mul(gratuityDays(years), daily);

      const encash = await tx
        .select({ balance: leaveBalances.balance })
        .from(leaveBalances)
        .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
        .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveTypes.isEncashable, true)));
      const leaveDays = encash.reduce((a, r) => M.add(a, M.money(r.balance ?? '0')), M.money(0));
      const leaveEncashment = M.mul(leaveDays, daily);
      const total = M.add(gratuity, leaveEncashment);

      const [row] = await tx
        .insert(endOfService)
        .values({
          tenantId,
          companyId,
          employeeId,
          terminationDate: termDate,
          lastBasicSalary: M.toDb(basic),
          yearsOfService: M.toDb(years),
          gratuityAmount: M.toDb(gratuity),
          leaveEncashment: M.toDb(leaveEncashment),
          otherSettlements: '0',
          totalAmount: M.toDb(total),
        })
        .returning();
      return row;
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, companyId, id));
  }

  approve(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.find(tx, companyId, id);
      if (e.status !== 'draft') throw new UnprocessableEntityException('Only draft settlements can be approved');
      const [row] = await tx.update(endOfService).set({ status: 'approved', updatedAt: new Date() }).where(eq(endOfService.id, id)).returning();
      return row;
    });
  }

  // DR End of Service expense / CR End of Service payable
  pay(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.find(tx, companyId, id);
      if (e.status !== 'approved') throw new UnprocessableEntityException('Only approved settlements can be paid');
      const total = M.money(e.totalAmount);
      const expense = await ensureAccount(tx, tenantId, companyId, '6300', 'End of Service Expense', 'expense');
      const payable = await ensureAccount(tx, tenantId, companyId, '2600', 'EOS Payable', 'liability');
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        date: e.terminationDate,
        description: `End of service ${e.terminationDate}`,
        userId: actor.sub,
        lines: [
          { accountId: expense, debit: M.toDb(total), credit: '0' },
          { accountId: payable, debit: '0', credit: M.toDb(total) },
        ],
      });
      const [row] = await tx
        .update(endOfService)
        .set({ status: 'paid', journalEntryId: jeId, updatedAt: new Date() })
        .where(eq(endOfService.id, id))
        .returning();
      return row;
    });
  }
}
