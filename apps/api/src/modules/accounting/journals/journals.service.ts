import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { accounts, Db, fiscalYears, journalEntries, journalLines, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { assertPostableLines, LineIn, nextNumber, openFyFor, total } from '../accounting.util';
import { CreateJournalDto, JournalLineDto, JournalQueryDto, UpdateJournalDto } from './journals.dto';

type Entry = typeof journalEntries.$inferSelect;

const toLines = (ls: JournalLineDto[]): LineIn[] =>
  ls.map((l) => ({ accountId: l.accountId, debit: l.debit ?? '0', credit: l.credit ?? '0', description: l.description }));

const insertLines = async (tx: Tx, tenantId: string, companyId: string, entryId: string, lines: LineIn[]) => {
  if (!lines.length) return;
  await tx.insert(journalLines).values(
    lines.map((l, i) => ({
      tenantId,
      companyId,
      journalEntryId: entryId,
      accountId: l.accountId,
      debit: M.toDb(M.money(l.debit)),
      credit: M.toDb(M.money(l.credit)),
      description: l.description,
      sortOrder: i,
    })),
  );
};

@Injectable()
export class JournalsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async findEntry(tx: Tx, companyId: string, id: string): Promise<Entry> {
    const [e] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, id), eq(journalEntries.companyId, companyId)))
      .limit(1);
    if (!e) throw new NotFoundException('Journal entry not found');
    return e;
  }

  private assertDraft(e: Entry): void {
    if (e.status !== 'draft') throw new UnprocessableEntityException('Posted journal entries are immutable');
  }

  private async rawLines(tx: Tx, entryId: string) {
    return tx.select().from(journalLines).where(eq(journalLines.journalEntryId, entryId));
  }

  private async load(tx: Tx, companyId: string, id: string) {
    const e = await this.findEntry(tx, companyId, id);
    const lines = await tx
      .select({
        id: journalLines.id,
        accountId: journalLines.accountId,
        code: accounts.code,
        accountName: accounts.name,
        debit: journalLines.debit,
        credit: journalLines.credit,
        description: journalLines.description,
        sortOrder: journalLines.sortOrder,
      })
      .from(journalLines)
      .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
      .where(eq(journalLines.journalEntryId, id))
      .orderBy(asc(journalLines.sortOrder));
    return { ...e, lines };
  }

  // Balance check, FY open, then flip to posted (draft -> posted only)
  private async postInTx(tx: Tx, e: Entry, lines: LineIn[], userId: string): Promise<void> {
    if (!lines.length) throw new UnprocessableEntityException('Entry has no lines');
    const dr = total(lines.map((l) => l.debit));
    const cr = total(lines.map((l) => l.credit));
    if (!M.eq(dr, cr)) {
      throw new UnprocessableEntityException(`Unbalanced entry: debit ${M.toDb(dr)} != credit ${M.toDb(cr)}`);
    }
    await assertPostableLines(tx, e.companyId, lines);
    const [fy] = await tx.select().from(fiscalYears).where(eq(fiscalYears.id, e.fiscalYearId)).limit(1);
    if (!fy || fy.status !== 'open') throw new UnprocessableEntityException('Fiscal year is not open');
    await tx
      .update(journalEntries)
      .set({ status: 'posted', postedAt: new Date(), postedBy: userId, updatedAt: new Date() })
      .where(eq(journalEntries.id, e.id));
  }

  list(actor: AccessTokenPayload, q: JournalQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(journalEntries.companyId, companyId)];
    if (q.status) conds.push(eq(journalEntries.status, q.status));
    if (q.fiscalYearId) conds.push(eq(journalEntries.fiscalYearId, q.fiscalYearId));
    if (q.dateFrom) conds.push(gte(journalEntries.date, q.dateFrom));
    if (q.dateTo) conds.push(lte(journalEntries.date, q.dateTo));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx
        .select()
        .from(journalEntries)
        .where(where)
        .orderBy(desc(journalEntries.date), desc(journalEntries.number))
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);
      const [{ total: n }] = await tx.select({ total: count() }).from(journalEntries).where(where);
      const ids = items.map((i) => i.id);
      const sums = ids.length
        ? await tx
            .select({ id: journalLines.journalEntryId, d: sql<string>`coalesce(sum(${journalLines.debit}),0)` })
            .from(journalLines)
            .where(inArray(journalLines.journalEntryId, ids))
            .groupBy(journalLines.journalEntryId)
        : [];
      const byId = new Map(sums.map((s) => [s.id, s.d]));
      return {
        items: items.map((i) => ({ ...i, totalDebit: byId.get(i.id) ?? '0' })),
        total: n,
        page: q.page,
        limit: q.limit,
      };
    });
  }

  getById(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateJournalDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const lines = toLines(dto.lines);
      await assertPostableLines(tx, companyId, lines);
      const fy = await openFyFor(tx, companyId, dto.date);
      const number = await nextNumber(tx, companyId, 'JE', dto.date.slice(0, 4));
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          fiscalYearId: fy.id,
          number,
          date: dto.date,
          description: dto.description,
          descriptionAr: dto.descriptionAr,
          currency: dto.currency ?? 'AED',
          exchangeRate: dto.exchangeRate ?? '1',
          createdBy: actor.sub,
        })
        .returning();
      await insertLines(tx, tenantId, companyId, entry.id, lines);
      return this.load(tx, companyId, entry.id);
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateJournalDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.findEntry(tx, companyId, id);
      this.assertDraft(e);
      const lines = dto.lines ? toLines(dto.lines) : undefined;
      if (lines) await assertPostableLines(tx, companyId, lines);
      const fy = await openFyFor(tx, companyId, dto.date ?? e.date);
      await tx
        .update(journalEntries)
        .set({
          date: dto.date,
          fiscalYearId: fy.id,
          description: dto.description,
          descriptionAr: dto.descriptionAr,
          branchId: dto.branchId,
          currency: dto.currency,
          exchangeRate: dto.exchangeRate,
          updatedAt: new Date(),
        })
        .where(eq(journalEntries.id, id));
      if (lines) {
        await tx.delete(journalLines).where(eq(journalLines.journalEntryId, id));
        await insertLines(tx, tenantId, companyId, id, lines);
      }
      return this.load(tx, companyId, id);
    });
  }

  delete(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.findEntry(tx, companyId, id);
      this.assertDraft(e);
      await tx.delete(journalLines).where(eq(journalLines.journalEntryId, id));
      await tx.delete(journalEntries).where(eq(journalEntries.id, id));
      return { id, deleted: true };
    });
  }

  post(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const e = await this.findEntry(tx, companyId, id);
      if (e.status !== 'draft') throw new UnprocessableEntityException('Only draft entries can be posted');
      await this.postInTx(tx, e, await this.rawLines(tx, id), actor.sub);
      return this.load(tx, companyId, id);
    });
  }

  // Counter-entry with swapped sides, auto-posted; original marked reversed
  reverse(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const orig = await this.findEntry(tx, companyId, id);
      if (orig.status !== 'posted') throw new UnprocessableEntityException('Only posted entries can be reversed');
      if (orig.reversesId) throw new UnprocessableEntityException('A reversal entry cannot be reversed');
      const origLines = await this.rawLines(tx, id);
      const fy = await openFyFor(tx, companyId, orig.date);
      const number = await nextNumber(tx, companyId, 'JE', orig.date.slice(0, 4));
      const [rev] = await tx
        .insert(journalEntries)
        .values({
          tenantId,
          companyId,
          branchId: orig.branchId,
          fiscalYearId: fy.id,
          number,
          date: orig.date,
          description: `Reversal of ${orig.number}`,
          currency: orig.currency,
          exchangeRate: orig.exchangeRate,
          reversesId: orig.id,
          createdBy: actor.sub,
        })
        .returning();
      const swapped: LineIn[] = origLines.map((l) => ({
        accountId: l.accountId,
        debit: l.credit,
        credit: l.debit,
        description: l.description ?? undefined,
      }));
      await insertLines(tx, tenantId, companyId, rev.id, swapped);
      await this.postInTx(tx, rev, swapped, actor.sub);
      await tx
        .update(journalEntries)
        .set({ status: 'reversed', reversedById: rev.id, updatedAt: new Date() })
        .where(eq(journalEntries.id, orig.id));
      return this.load(tx, companyId, rev.id);
    });
  }
}
