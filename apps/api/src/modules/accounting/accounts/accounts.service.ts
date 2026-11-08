import {
  ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { accounts, Db, journalEntries, journalLines, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { MAX_LEVEL, NormalBalance, normalFor, signedBalance } from '../accounting.util';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';

type Row = typeof accounts.$inferSelect;
export type TreeNode = Row & { balance: string; children: TreeNode[] };

@Injectable()
export class AccountsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  // Posted and reversed entries count; drafts do not
  private async sums(tx: Tx, companyId: string) {
    const rows = await tx
      .select({
        accountId: journalLines.accountId,
        d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
        c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
      .where(and(eq(journalEntries.companyId, companyId), inArray(journalEntries.status, ['posted', 'reversed'])))
      .groupBy(journalLines.accountId);
    return new Map(rows.map((r) => [r.accountId, { d: M.money(r.d), c: M.money(r.c) }]));
  }

  private async tree(tx: Tx, companyId: string): Promise<TreeNode[]> {
    const rows = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.companyId, companyId), isNull(accounts.deletedAt)))
      .orderBy(asc(accounts.code));
    const sums = await this.sums(tx, companyId);
    const ids = new Set(rows.map((r) => r.id));
    const kids = new Map<string | null, Row[]>();
    for (const r of rows) {
      const key = r.parentId && ids.has(r.parentId) ? r.parentId : null;
      kids.set(key, [...(kids.get(key) ?? []), r]);
    }
    // header balance = own posted balance + all descendants
    const build = (r: Row): TreeNode => {
      const children = (kids.get(r.id) ?? []).map(build);
      const s = sums.get(r.id);
      let t = signedBalance(r.normalBalance as NormalBalance, s?.d ?? M.money(0), s?.c ?? M.money(0));
      for (const c of children) t = M.add(t, M.money(c.balance));
      return { ...r, balance: M.toDb(t), children };
    };
    return (kids.get(null) ?? []).map(build);
  }

  async list(actor: AccessTokenPayload): Promise<TreeNode[]> {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.tree(tx, companyId));
  }

  async getById(actor: AccessTokenPayload, id: string): Promise<TreeNode> {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const flat = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((n) => [n, ...flat(n.children)]);
      const node = flat(await this.tree(tx, companyId)).find((n) => n.id === id);
      if (!node) throw new NotFoundException('Account not found');
      return node;
    });
  }

  private async find(tx: Tx, companyId: string, id: string): Promise<Row> {
    const [row] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.companyId, companyId), isNull(accounts.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundException('Account not found');
    return row;
  }

  private async codeTaken(tx: Tx, companyId: string, code: string, exceptId?: string): Promise<boolean> {
    const [r] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.companyId, companyId), eq(accounts.code, code)))
      .limit(1);
    return !!r && r.id !== exceptId;
  }

  private async hasPostings(tx: Tx, accountId: string): Promise<boolean> {
    const [r] = await tx
      .select({ id: journalLines.id })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
      .where(and(eq(journalLines.accountId, accountId), inArray(journalEntries.status, ['posted', 'reversed'])))
      .limit(1);
    return !!r;
  }

  create(actor: AccessTokenPayload, dto: CreateAccountDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      let level = 1;
      if (dto.parentId) {
        const parent = await this.find(tx, companyId, dto.parentId).catch(() => {
          throw new NotFoundException('Parent account not found');
        });
        if (!parent.isActive) throw new UnprocessableEntityException('Parent account is inactive');
        level = parent.level + 1;
        if (level > MAX_LEVEL) throw new UnprocessableEntityException(`Maximum account depth is ${MAX_LEVEL} levels`);
        if (parent.type !== dto.type) throw new UnprocessableEntityException('Child account type must match parent type');
      }
      const normal = normalFor(dto.type);
      if (dto.normalBalance && dto.normalBalance !== normal) {
        throw new UnprocessableEntityException('Normal balance does not match account type');
      }
      if (await this.codeTaken(tx, companyId, dto.code)) throw new ConflictException('Account code already exists');
      const [row] = await tx
        .insert(accounts)
        .values({
          tenantId,
          companyId,
          parentId: dto.parentId ?? null,
          code: dto.code,
          name: dto.name,
          nameAr: dto.nameAr,
          type: dto.type,
          normalBalance: normal,
          level,
          isHeader: dto.isHeader ?? false,
          description: dto.description,
        })
        .returning();
      return row;
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateAccountDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const acct = await this.find(tx, companyId, id);
      const codeChanged = dto.code !== undefined && dto.code !== acct.code;
      const typeChanged = dto.type !== undefined && dto.type !== acct.type;
      const headerChanged = dto.isHeader !== undefined && dto.isHeader !== acct.isHeader;
      if ((codeChanged || typeChanged || headerChanged) && (await this.hasPostings(tx, id))) {
        throw new UnprocessableEntityException('Account has postings: code, type and header flag are locked');
      }
      if ((codeChanged || typeChanged) && acct.isSystem) {
        throw new UnprocessableEntityException('System account code and type cannot be changed');
      }
      if (typeChanged) {
        const [child] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.parentId, id)).limit(1);
        if (child) throw new UnprocessableEntityException('Account has child accounts');
        if (acct.parentId) {
          const parent = await this.find(tx, companyId, acct.parentId);
          if (parent.type !== dto.type) throw new UnprocessableEntityException('Child account type must match parent type');
        }
      }
      if (codeChanged && (await this.codeTaken(tx, companyId, dto.code!, id))) {
        throw new ConflictException('Account code already exists');
      }
      const [row] = await tx
        .update(accounts)
        .set({
          code: dto.code,
          name: dto.name,
          nameAr: dto.nameAr,
          type: dto.type,
          normalBalance: dto.type ? normalFor(dto.type) : undefined,
          isHeader: dto.isHeader,
          description: dto.description,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, id))
        .returning();
      return row;
    });
  }

  // Soft delete: sets is_active = false
  deactivate(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const acct = await this.find(tx, companyId, id);
      if (acct.isSystem) throw new UnprocessableEntityException('System accounts cannot be deleted');
      const [child] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.parentId, id), eq(accounts.isActive, true)))
        .limit(1);
      if (child) throw new UnprocessableEntityException('Account has active child accounts');
      const s = (await this.sums(tx, companyId)).get(id);
      const open = signedBalance(acct.normalBalance as NormalBalance, s?.d ?? M.money(0), s?.c ?? M.money(0));
      if (!open.isZero()) throw new UnprocessableEntityException('Account has an open balance');
      const [row] = await tx
        .update(accounts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(accounts.id, id))
        .returning();
      return row;
    });
  }
}
