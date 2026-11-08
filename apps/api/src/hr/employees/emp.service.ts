import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { Db, employees, leaveBalances, leaveTypes, salaryStructures, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { nextSeqNo } from '../hr.util';
import { CreateEmployeeDto, EmployeeQueryDto, SalaryStructureDto, TerminateDto, UpdateEmployeeDto } from './emp.dto';

@Injectable()
export class EmployeesService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [e] = await tx.select().from(employees).where(and(eq(employees.id, id), eq(employees.companyId, companyId))).limit(1);
    if (!e) throw new NotFoundException('Employee not found');
    return e;
  }

  private async activeStructure(tx: Tx, companyId: string, employeeId: string) {
    const [s] = await tx
      .select()
      .from(salaryStructures)
      .where(and(eq(salaryStructures.employeeId, employeeId), eq(salaryStructures.companyId, companyId), eq(salaryStructures.isActive, true)))
      .orderBy(desc(salaryStructures.effectiveDate))
      .limit(1);
    return s ?? null;
  }

  list(actor: AccessTokenPayload, q: EmployeeQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(employees.companyId, companyId)];
    if (q.status) conds.push(eq(employees.status, q.status as 'active' | 'terminated' | 'on_leave' | 'suspended'));
    if (q.departmentId) conds.push(eq(employees.departmentId, q.departmentId));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(or(ilike(employees.nameEn, s), ilike(employees.nameAr, s), ilike(employees.employeeNumber, s))!);
    }
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(employees).where(where).orderBy(employees.employeeNumber).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(employees).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  // Employee + active salary structure + leave balances for the current year
  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.find(tx, companyId, id);
      const salary = await this.activeStructure(tx, companyId, id);
      const year = new Date().getUTCFullYear();
      const balances = await tx
        .select({ leaveTypeId: leaveBalances.leaveTypeId, code: leaveTypes.code, balance: leaveBalances.balance, taken: leaveBalances.taken })
        .from(leaveBalances)
        .innerJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeId))
        .where(and(eq(leaveBalances.employeeId, id), eq(leaveBalances.year, year)));
      return { ...e, salary, leaveBalances: balances };
    });
  }

  create(actor: AccessTokenPayload, dto: CreateEmployeeDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const employeeNumber = await nextSeqNo(tx, companyId, 'EMP');
      const [row] = await tx.insert(employees).values({ ...dto, tenantId, companyId, employeeNumber }).returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateEmployeeDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const [row] = await tx.update(employees).set({ ...dto, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
      return row;
    });
  }

  // Sets status terminated; EOS is calculated separately
  terminate(actor: AccessTokenPayload, id: string, dto: TerminateDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.find(tx, companyId, id);
      if (e.status === 'terminated') throw new UnprocessableEntityException('Employee already terminated');
      if (dto.terminationDate < e.hireDate) throw new UnprocessableEntityException('Termination date is before hire date');
      const [row] = await tx
        .update(employees)
        .set({ status: 'terminated', terminationDate: dto.terminationDate, updatedAt: new Date() })
        .where(eq(employees.id, id))
        .returning();
      return row;
    });
  }

  // Deactivates previous active structure, stores new one with computed gross
  setSalary(actor: AccessTokenPayload, id: string, dto: SalaryStructureDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      await tx
        .update(salaryStructures)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(salaryStructures.employeeId, id), eq(salaryStructures.isActive, true)));
      const basic = M.money(dto.basicSalary);
      const housing = M.money(dto.housingAllowance ?? '0');
      const transport = M.money(dto.transportAllowance ?? '0');
      const other = M.money(dto.otherAllowances ?? '0');
      const [row] = await tx
        .insert(salaryStructures)
        .values({
          tenantId,
          companyId,
          employeeId: id,
          effectiveDate: dto.effectiveDate,
          basicSalary: M.toDb(basic),
          housingAllowance: M.toDb(housing),
          transportAllowance: M.toDb(transport),
          otherAllowances: M.toDb(other),
          grossSalary: M.toDb(M.add(M.add(basic, housing), M.add(transport, other))),
        })
        .returning();
      return row;
    });
  }

  getSalary(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const s = await this.activeStructure(tx, companyId, id);
      if (!s) throw new NotFoundException('No active salary structure');
      return s;
    });
  }
}
