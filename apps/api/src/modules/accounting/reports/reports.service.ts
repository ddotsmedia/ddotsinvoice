import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { accounts, Db, fiscalYears, journalEntries, journalLines, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { NormalBalance, signedBalance } from '../accounting.util';

@Injectable()
export class ReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  trialBalance(actor: AccessTokenPayload, fiscalYearId: string, asOf: string) {
    const tenantId = requireTenant(actor.tenantId);
    const companyId = requireCompany(actor.companyId);
    return withTenant(this.db, tenantId, async (tx) => {
      const [fy] = await tx
        .select({ id: fiscalYears.id })
        .from(fiscalYears)
        .where(and(eq(fiscalYears.id, fiscalYearId), eq(fiscalYears.companyId, companyId)))
        .limit(1);
      if (!fy) throw new NotFoundException('Fiscal year not found');

      // reversed entries were posted, so their lines count too (original + reversal net to zero)
      const sums = await tx
        .select({
          accountId: journalLines.accountId,
          d: sql<string>`coalesce(sum(${journalLines.debit}),0)`,
          c: sql<string>`coalesce(sum(${journalLines.credit}),0)`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalEntries.id, journalLines.journalEntryId))
        .where(
          and(
            eq(journalEntries.companyId, companyId),
            inArray(journalEntries.status, ['posted', 'reversed']),
            eq(journalEntries.fiscalYearId, fiscalYearId),
            lte(journalEntries.date, asOf),
          ),
        )
        .groupBy(journalLines.accountId);

      const ids = sums.map((s) => s.accountId);
      const accts = ids.length
        ? await tx.select().from(accounts).where(and(eq(accounts.companyId, companyId), inArray(accounts.id, ids)))
        : [];
      const byId = new Map(accts.map((a) => [a.id, a]));

      let gd = M.money(0);
      let gc = M.money(0);
      const rows = sums
        .filter((s) => byId.has(s.accountId))
        .map((s) => {
          const a = byId.get(s.accountId)!;
          const d = M.money(s.d);
          const c = M.money(s.c);
          gd = M.add(gd, d);
          gc = M.add(gc, c);
          return {
            account: { code: a.code, name: a.name, type: a.type, normalBalance: a.normalBalance },
            totalDebit: M.toDb(d),
            totalCredit: M.toDb(c),
            balance: M.toDb(signedBalance(a.normalBalance as NormalBalance, d, c)),
          };
        })
        .sort((x, y) => x.account.code.localeCompare(y.account.code));

      if (!M.eq(gd, gc)) {
        throw new InternalServerErrorException({
          message: 'Trial balance is out of balance',
          totalDebit: M.toDb(gd),
          totalCredit: M.toDb(gc),
        });
      }
      return { fiscalYearId, asOf, rows, totalDebit: M.toDb(gd), totalCredit: M.toDb(gc) };
    });
  }
}
