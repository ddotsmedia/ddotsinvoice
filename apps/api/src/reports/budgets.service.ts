import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { accounts, budgetLines, budgets, Db, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { movements } from './report.util';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min, ArrayMinSize, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetLineDto {
  @IsUUID() accountId!: string;
  @Matches(/^\d{1,14}(\.\d{1,6})?$/) budgetedAmount!: string;
}

export class CreateBudgetDto {
  @IsString() @MaxLength(255) name!: string;
  @IsInt() @Min(2000) @Max(2100) fiscalYear!: number;
  @IsOptional() @IsInt() @Min(1) @Max(12) fiscalMonth?: number;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => BudgetLineDto) lines!: BudgetLineDto[];
}

export class BudgetQueryDto {
  @IsOptional() @IsInt() @Min(2000) @Max(2100) year?: number;
}

@Injectable()
export class BudgetsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [b] = await tx.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.companyId, companyId))).limit(1);
    if (!b) throw new NotFoundException('Budget not found');
    return b;
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const b = await this.find(tx, companyId, id);
    const lines = await tx
      .select({
        id: budgetLines.id, accountId: budgetLines.accountId, code: accounts.code, nameEn: accounts.name,
        budgetedAmount: budgetLines.budgetedAmount, actualAmount: budgetLines.actualAmount, variance: budgetLines.variance,
      })
      .from(budgetLines)
      .innerJoin(accounts, eq(accounts.id, budgetLines.accountId))
      .where(eq(budgetLines.budgetId, id))
      .orderBy(asc(accounts.code));
    return { ...b, lines };
  }

  list(actor: AccessTokenPayload, q: BudgetQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds = [eq(budgets.companyId, companyId)];
    if (q.year) conds.push(eq(budgets.fiscalYear, q.year));
    return withTenant(this.db, tenantId, (tx) => tx.select().from(budgets).where(and(...conds)).orderBy(asc(budgets.fiscalYear)));
  }

  findOne(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateBudgetDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const ids = [...new Set(dto.lines.map((l) => l.accountId))];
      const found = await tx.select({ id: accounts.id, isHeader: accounts.isHeader }).from(accounts).where(and(eq(accounts.companyId, companyId)));
      const valid = new Map(found.map((a) => [a.id, a]));
      for (const id of ids) {
        const a = valid.get(id);
        if (!a) throw new NotFoundException('Account not found');
        if (a.isHeader) throw new UnprocessableEntityException('Budget lines must use postable accounts');
      }
      const [b] = await tx
        .insert(budgets)
        .values({ tenantId, companyId, name: dto.name, fiscalYear: dto.fiscalYear, fiscalMonth: dto.fiscalMonth ?? null })
        .returning();
      await tx.insert(budgetLines).values(
        dto.lines.map((l) => ({
          budgetId: b.id, tenantId, companyId, accountId: l.accountId,
          budgetedAmount: M.toDb(M.money(l.budgetedAmount)), actualAmount: '0', variance: M.toDb(M.sub(M.money(0), M.money(l.budgetedAmount))),
        })),
      );
      return this.load(tx, companyId, b.id);
    });
  }

  approve(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const b = await this.find(tx, companyId, id);
      if (b.status !== 'draft') throw new UnprocessableEntityException('Only draft budgets can be approved');
      await tx.update(budgets).set({ status: 'approved', approvedBy: actor.sub, approvedAt: new Date(), updatedAt: new Date() }).where(eq(budgets.id, id));
      return this.load(tx, companyId, id);
    });
  }

  // Actual = posted activity in the budget period, signed by the account's normal side
  refreshActuals(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const b = await this.find(tx, companyId, id);
      const from = b.fiscalMonth ? `${b.fiscalYear}-${String(b.fiscalMonth).padStart(2, '0')}-01` : `${b.fiscalYear}-01-01`;
      const last = b.fiscalMonth ? new Date(Date.UTC(b.fiscalYear, b.fiscalMonth, 0)).toISOString().slice(0, 10) : `${b.fiscalYear}-12-31`;
      const mv = await movements(tx, companyId, from, last);
      const lines = await tx.select().from(budgetLines).where(eq(budgetLines.budgetId, id));
      const accts = new Map((await tx.select().from(accounts).where(eq(accounts.companyId, companyId))).map((a) => [a.id, a]));
      for (const l of lines) {
        const a = accts.get(l.accountId);
        const m = mv.get(l.accountId) ?? { d: M.money(0), c: M.money(0) };
        const actual = a?.normalBalance === 'debit' ? M.sub(m.d, m.c) : M.sub(m.c, m.d);
        const variance = M.sub(actual, M.money(l.budgetedAmount));
        await tx
          .update(budgetLines)
          .set({ actualAmount: M.toDb(actual), variance: M.toDb(variance), updatedAt: new Date() })
          .where(eq(budgetLines.id, l.id));
      }
      return this.load(tx, companyId, id);
    });
  }
}
