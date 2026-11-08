import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { companies, Db, employees, payrollLines, payrollRuns, salaryStructures, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { postJournal } from '../../modules/accounting/journal-posting';
import { ensureAccount, sumM } from '../../purchasing/purchasing.util';
import { lastDayOf } from '../hr.util';
import { GeneratePayrollDto, PayrollQueryDto } from './payroll.dto';

@Injectable()
export class PayrollService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [r] = await tx.select().from(payrollRuns).where(and(eq(payrollRuns.id, id), eq(payrollRuns.companyId, companyId))).limit(1);
    if (!r) throw new NotFoundException('Payroll run not found');
    return r;
  }

  private lines(tx: Tx, runId: string) {
    return tx.select().from(payrollLines).where(eq(payrollLines.payrollRunId, runId)).orderBy(asc(payrollLines.createdAt));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const r = await this.find(tx, companyId, id);
    return { ...r, lines: await this.lines(tx, id) };
  }

  list(actor: AccessTokenPayload, q: PayrollQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const where = eq(payrollRuns.companyId, companyId);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select().from(payrollRuns).where(where).orderBy(desc(payrollRuns.periodYear), desc(payrollRuns.periodMonth)).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(payrollRuns).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  // One run per company per period; lines snapshot each active employee's structure
  generate(actor: AccessTokenPayload, dto: GeneratePayrollDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [dup] = await tx
        .select({ id: payrollRuns.id })
        .from(payrollRuns)
        .where(and(eq(payrollRuns.companyId, companyId), eq(payrollRuns.periodYear, dto.periodYear), eq(payrollRuns.periodMonth, dto.periodMonth)))
        .limit(1);
      if (dup) throw new UnprocessableEntityException('Payroll already exists for this period');

      const empConds = [eq(employees.companyId, companyId), eq(employees.status, 'active')];
      if (dto.branchId) empConds.push(eq(employees.branchId, dto.branchId));
      const emps = await tx.select().from(employees).where(and(...empConds));

      const [run] = await tx
        .insert(payrollRuns)
        .values({ tenantId, companyId, branchId: dto.branchId, periodYear: dto.periodYear, periodMonth: dto.periodMonth })
        .returning();

      for (const e of emps) {
        const [s] = await tx
          .select()
          .from(salaryStructures)
          .where(and(eq(salaryStructures.employeeId, e.id), eq(salaryStructures.isActive, true)))
          .orderBy(desc(salaryStructures.effectiveDate))
          .limit(1);
        if (!s) continue;
        await tx.insert(payrollLines).values({
          payrollRunId: run.id,
          tenantId,
          companyId,
          employeeId: e.id,
          basicSalary: s.basicSalary,
          housingAllowance: s.housingAllowance ?? '0',
          transportAllowance: s.transportAllowance ?? '0',
          otherAllowances: s.otherAllowances ?? '0',
          grossSalary: s.grossSalary,
          deductions: '0',
          netSalary: s.grossSalary,
          workingDays: 30,
          paidDays: '30',
        });
      }

      const rows = await this.lines(tx, run.id);
      const gross = sumM(rows.map((r) => M.money(r.grossSalary)));
      const ded = sumM(rows.map((r) => M.money(r.deductions ?? '0')));
      const net = sumM(rows.map((r) => M.money(r.netSalary)));
      await tx
        .update(payrollRuns)
        .set({ totalGross: M.toDb(gross), totalDeductions: M.toDb(ded), totalNet: M.toDb(net), updatedAt: new Date() })
        .where(eq(payrollRuns.id, run.id));
      return this.load(tx, companyId, run.id);
    });
  }

  approve(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'draft') throw new UnprocessableEntityException('Only draft payroll can be approved');
      await tx
        .update(payrollRuns)
        .set({ status: 'approved', approvedBy: actor.sub, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(payrollRuns.id, id));
      return this.load(tx, companyId, id);
    });
  }

  // DR Salaries expense (gross) / CR Salaries payable (net) / CR Deductions payable
  pay(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'approved') throw new UnprocessableEntityException('Only approved payroll can be paid');
      const rows = (await this.lines(tx, id)).filter((l) => l.status === 'included');
      const gross = sumM(rows.map((l) => M.money(l.grossSalary)));
      const ded = sumM(rows.map((l) => M.money(l.deductions ?? '0')));
      const net = sumM(rows.map((l) => M.money(l.netSalary)));
      const expense = await ensureAccount(tx, tenantId, companyId, '6200', 'Salaries Expense', 'expense');
      const payable = await ensureAccount(tx, tenantId, companyId, '2500', 'Salaries Payable', 'liability');
      const dedAcct = await ensureAccount(tx, tenantId, companyId, '2510', 'Deductions Payable', 'liability');
      const lines = [
        { accountId: expense, debit: M.toDb(gross), credit: '0' },
        { accountId: payable, debit: '0', credit: M.toDb(net) },
      ];
      if (!ded.isZero()) lines.push({ accountId: dedAcct, debit: '0', credit: M.toDb(ded) });
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: r.branchId,
        date: lastDayOf(r.periodYear, r.periodMonth),
        description: `Payroll ${r.periodYear}-${String(r.periodMonth).padStart(2, '0')}`,
        userId: actor.sub,
        lines,
      });
      await tx
        .update(payrollRuns)
        .set({ status: 'paid', journalEntryId: jeId, paidAt: new Date(), updatedAt: new Date() })
        .where(eq(payrollRuns.id, id));
      return this.load(tx, companyId, id);
    });
  }

  // WPS SIF v2.0-style file: EDR header, EER per employee, FTR trailer (CRLF)
  wps(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'approved' && r.status !== 'paid') throw new UnprocessableEntityException('WPS requires approved or paid payroll');
      const [co] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      const rows = (await this.lines(tx, id)).filter((l) => l.status === 'included');
      const emps = rows.length
        ? await tx.select().from(employees).where(inArray(employees.id, rows.map((l) => l.employeeId)))
        : [];
      const byId = new Map(emps.map((e) => [e.id, e]));
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const hm = now.toISOString().slice(11, 16).replace(':', '');
      const period = `${r.periodYear}${String(r.periodMonth).padStart(2, '0')}`;
      const totalNet = sumM(rows.map((l) => M.money(l.netSalary)));
      const out = [`EDR,${co?.trn ?? ''},${co?.trn ?? ''},${ymd},${hm},${period},${rows.length},${totalNet.toFixed(2)}`];
      for (const l of rows) {
        const e = byId.get(l.employeeId);
        out.push([
          'EER', e?.employeeNumber ?? '', e?.routingCode ?? '', e?.ibanNumber ?? e?.bankAccountNumber ?? '', e?.bankName ?? '',
          M.money(l.paidDays ?? '0').toString(), M.money(l.basicSalary).toFixed(2), M.money(l.housingAllowance).toFixed(2),
          M.money(l.transportAllowance).toFixed(2), M.money(l.otherAllowances).toFixed(2), M.money(l.deductions ?? '0').toFixed(2),
          M.money(l.netSalary).toFixed(2), '',
        ].join(','));
      }
      out.push(`FTR,${rows.length},${totalNet.toFixed(2)}`);
      const fileName = `WPS-${period}.sif`;
      await tx.update(payrollRuns).set({ wpsFileGenerated: true, wpsFileName: fileName, updatedAt: new Date() }).where(eq(payrollRuns.id, id));
      return { fileName, content: out.join('\r\n') + '\r\n' };
    });
  }

  cancel(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const r = await this.find(tx, companyId, id);
      if (r.status !== 'draft' && r.status !== 'approved') throw new UnprocessableEntityException('Only draft or approved payroll can be cancelled');
      await tx.update(payrollRuns).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(payrollRuns.id, id));
      return this.load(tx, companyId, id);
    });
  }

  // Totals per department
  summary(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.find(tx, companyId, id);
      const rows = await this.lines(tx, id);
      const emps = rows.length ? await tx.select().from(employees).where(inArray(employees.id, rows.map((l) => l.employeeId))) : [];
      const dept = new Map(emps.map((e) => [e.id, e.departmentId ?? 'unassigned']));
      const groups = new Map<string, { headcount: number; gross: M.Money; net: M.Money }>();
      for (const l of rows) {
        const k = dept.get(l.employeeId) ?? 'unassigned';
        const g = groups.get(k) ?? { headcount: 0, gross: M.money(0), net: M.money(0) };
        groups.set(k, { headcount: g.headcount + 1, gross: M.add(g.gross, M.money(l.grossSalary)), net: M.add(g.net, M.money(l.netSalary)) });
      }
      return [...groups].map(([departmentId, g]) => ({ departmentId, headcount: g.headcount, gross: M.toDb(g.gross), net: M.toDb(g.net) }));
    });
  }
}
