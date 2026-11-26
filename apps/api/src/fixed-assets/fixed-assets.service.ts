import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { and, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { fixedAssets, assetDepreciationSchedules, Db } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { CreateFixedAssetDto, UpdateFixedAssetDto, DisposeAssetDto, FixedAssetQueryDto } from './fixed-assets.dto';

@Injectable()
export class FixedAssetsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    const companyId = actor.companyId!;
    return { companyId, tenantId: actor.tenantId! };
  }

  async list(actor: AccessTokenPayload, q: FixedAssetQueryDto) {
    const { companyId } = this.scope(actor);
    const filters = [eq(fixedAssets.companyId, companyId), isNull(fixedAssets.deletedAt)];
    if (q.category) filters.push(eq(fixedAssets.category, q.category));
    if (q.status) filters.push(eq(fixedAssets.status, q.status as 'active' | 'fully_depreciated' | 'disposed' | 'idle'));
    if (q.search) filters.push(or(
      ilike(fixedAssets.name, `%${q.search}%`),
      ilike(fixedAssets.code, `%${q.search}%`),
    )!);
    return this.db.select().from(fixedAssets).where(and(...filters)).orderBy(fixedAssets.code);
  }

  async getById(actor: AccessTokenPayload, id: string) {
    const { companyId } = this.scope(actor);
    const [asset] = await this.db.select().from(fixedAssets)
      .where(and(eq(fixedAssets.id, id), eq(fixedAssets.companyId, companyId), isNull(fixedAssets.deletedAt)));
    if (!asset) throw new NotFoundException('Fixed asset not found');
    return asset;
  }

  async create(actor: AccessTokenPayload, dto: CreateFixedAssetDto) {
    const { companyId, tenantId } = this.scope(actor);
    const [asset] = await this.db.insert(fixedAssets).values({
      ...dto,
      companyId,
      tenantId,
      acquisitionCost: String(dto.acquisitionCost),
      residualValue: String(dto.residualValue ?? 0),
      accumulatedDepreciation: '0',
    }).returning();
    return asset;
  }

  async update(actor: AccessTokenPayload, id: string, dto: UpdateFixedAssetDto) {
    const asset = await this.getById(actor, id);
    if (asset.status === 'disposed') throw new BadRequestException('Cannot update disposed asset');
    const [updated] = await this.db.update(fixedAssets).set({ ...dto, updatedAt: new Date() })
      .where(eq(fixedAssets.id, id)).returning();
    return updated;
  }

  async dispose(actor: AccessTokenPayload, id: string, dto: DisposeAssetDto) {
    const asset = await this.getById(actor, id);
    if (asset.status === 'disposed') throw new BadRequestException('Asset already disposed');
    const [updated] = await this.db.update(fixedAssets).set({
      status: 'disposed',
      disposalDate: dto.disposalDate,
      disposalValue: String(dto.disposalValue),
      disposalNotes: dto.disposalNotes,
      updatedAt: new Date(),
    }).where(eq(fixedAssets.id, id)).returning();
    return updated;
  }

  async remove(actor: AccessTokenPayload, id: string) {
    await this.getById(actor, id);
    await this.db.update(fixedAssets).set({ deletedAt: new Date() }).where(eq(fixedAssets.id, id));
    return { success: true };
  }

  /** Calculate the full depreciation schedule (not persisted, just returned for display) */
  async depreciationSchedule(actor: AccessTokenPayload, id: string) {
    const asset = await this.getById(actor, id);
    const cost = Number(asset.acquisitionCost);
    const residual = Number(asset.residualValue);
    const months = asset.usefulLifeMonths;
    const startDate = new Date(asset.acquisitionDate);

    const rows: { period: string; amount: number; bookValue: number }[] = [];
    let bookValue = cost;
    const monthlyRate = asset.depreciationMethod === 'straight_line'
      ? (cost - residual) / months
      : null;
    const decliningRate = asset.depreciationMethod === 'declining_balance'
      ? 1 - Math.pow(residual / cost, 1 / months)
      : null;

    for (let i = 0; i < months; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i + 1);
      const amount = asset.depreciationMethod === 'straight_line'
        ? monthlyRate!
        : bookValue * decliningRate!;
      const rounded = Math.round(amount * 100) / 100;
      bookValue = Math.max(residual, bookValue - rounded);
      rows.push({
        period: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        amount: rounded,
        bookValue: Math.round(bookValue * 100) / 100,
      });
    }

    // Fetch posted schedules to annotate
    const { companyId } = this.scope(actor);
    const posted = await this.db.select().from(assetDepreciationSchedules)
      .where(and(eq(assetDepreciationSchedules.assetId, id), eq(assetDepreciationSchedules.companyId, companyId)));
    const postedMap = new Map(posted.map((p) => [p.periodDate, p.posted]));

    return rows.map((r) => ({ ...r, posted: postedMap.get(r.period) ?? 'pending' }));
  }

  async categories(actor: AccessTokenPayload) {
    const { companyId } = this.scope(actor);
    const rows = await this.db.selectDistinct({ category: fixedAssets.category })
      .from(fixedAssets)
      .where(and(eq(fixedAssets.companyId, companyId), isNull(fixedAssets.deletedAt)));
    return rows.map((r) => r.category).filter(Boolean);
  }

  async summary(actor: AccessTokenPayload) {
    const { companyId } = this.scope(actor);
    const rows = await this.db.select({
      status: fixedAssets.status,
      count: sql<number>`count(*)::int`,
      totalCost: sql<string>`sum(acquisition_cost)::text`,
      totalAccumulated: sql<string>`sum(accumulated_depreciation)::text`,
    }).from(fixedAssets)
      .where(and(eq(fixedAssets.companyId, companyId), isNull(fixedAssets.deletedAt)))
      .groupBy(fixedAssets.status);
    return rows;
  }
}
