import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { Db, fiscalYears, journalEntries, Tx, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { CreateFiscalYearDto } from './fiscal-years.dto';

@Injectable()
export class FiscalYearsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string) {
    const [fy] = await tx
      .select()
      .from(fiscalYears)
      .where(and(eq(fiscalYears.id, id), eq(fiscalYears.companyId, companyId)))
      .limit(1);
    if (!fy) throw new NotFoundException('Fiscal year not found');
    return fy;
  }

  list(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(fiscalYears).where(eq(fiscalYears.companyId, companyId)).orderBy(desc(fiscalYears.startDate)),
    );
  }

  create(actor: AccessTokenPayload, dto: CreateFiscalYearDto) {
    const { tenantId, companyId } = this.scope(actor);
    if (dto.endDate < dto.startDate) throw new UnprocessableEntityException('endDate must be on or after startDate');
    return withTenant(this.db, tenantId, async (tx) => {
      const [overlap] = await tx
        .select({ id: fiscalYears.id })
        .from(fiscalYears)
        .where(
          and(
            eq(fiscalYears.companyId, companyId),
            lte(fiscalYears.startDate, dto.endDate),
            gte(fiscalYears.endDate, dto.startDate),
          ),
        )
        .limit(1);
      if (overlap) throw new UnprocessableEntityException('Date range overlaps an existing fiscal year');
      const [row] = await tx
        .insert(fiscalYears)
        .values({ tenantId, companyId, name: dto.name, startDate: dto.startDate, endDate: dto.endDate })
        .returning();
      return row;
    });
  }

  close(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const fy = await this.find(tx, companyId, id);
      if (fy.status !== 'open') throw new UnprocessableEntityException('Fiscal year is not open');
      const [draft] = await tx
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(and(eq(journalEntries.fiscalYearId, id), eq(journalEntries.status, 'draft')))
        .limit(1);
      if (draft) throw new UnprocessableEntityException('Draft journal entries exist in this fiscal year');
      const [row] = await tx
        .update(fiscalYears)
        .set({ status: 'closed', closedAt: new Date(), closedBy: actor.sub, updatedAt: new Date() })
        .where(eq(fiscalYears.id, id))
        .returning();
      return row;
    });
  }
}
