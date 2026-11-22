import { ConflictException, Inject, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type Redis from 'ioredis';
import { companies, Db, invoices, payrollRuns, platformSettings, purchaseOrders, refreshTokens, tenants, users } from '@ddotsinvoice/db';
import { AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { ADMIN_DB } from '../infra/drizzle.module';
import { REDIS } from '../infra/redis.module';
import { BootstrapTenantAdminDto, SearchQueryDto, UpdatePlatformSettingsDto } from './super-admin.dto';

export const IMPERSONATION_TTL_S = 900;
const POSTED_STATUSES = ['sent', 'posted', 'paid', 'partially_paid', 'overdue'] as const;

const tempPassword = (): string => randomBytes(9).toString('base64url');

const userCols = {
  id: users.id,
  tenantId: users.tenantId,
  companyId: users.companyId,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

const tenantStatus = (t: { isActive: boolean; plan: string }): 'active' | 'suspended' | 'trial' =>
  !t.isActive ? 'suspended' : t.plan === 'trial' ? 'trial' : 'active';

const page = (q: SearchQueryDto) => ({ limit: q.limit, offset: (q.page - 1) * q.limit, page: q.page });

/**
 * Cross-tenant platform operations. Uses the admin pool (superuser, bypasses RLS) —
 * only reachable through SuperAdminController, which is restricted to role super_admin.
 */
@Injectable()
export class SuperAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @Inject(ADMIN_DB) private readonly db: Db,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Seeds the platform super admin once. Production requires SUPER_ADMIN_PASSWORD to be set. */
  async onApplicationBootstrap(): Promise<void> {
    const email = (this.config.get<string>('SUPER_ADMIN_EMAIL') ?? 'sadmin@ddotsmedia.com').toLowerCase();
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD') ?? (this.config.get('NODE_ENV') === 'production' ? undefined : 'SuperAdmin2026!');
    try {
      const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing || !password) return;
      await this.db.insert(users).values({
        tenantId: null,
        companyId: null,
        email,
        passwordHash: await argon2.hash(password),
        firstName: 'Platform',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
      });
      this.logger.log(`Super admin seeded: ${email}`);
    } catch (e) {
      this.logger.warn(`Super admin bootstrap skipped: ${String(e)}`);
    }
  }

  async stats() {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [t] = await this.db.select({ n: count() }).from(tenants).where(isNull(tenants.deletedAt));
    const [c] = await this.db.select({ n: count() }).from(companies).where(isNull(companies.deletedAt));
    const [u] = await this.db.select({ n: count() }).from(users).where(isNull(users.deletedAt));
    const invoiceCond = and(eq(invoices.type, 'invoice'), inArray(invoices.status, [...POSTED_STATUSES]));
    const [inv] = await this.db
      .select({ n: count(), value: sql<string>`coalesce(sum(${invoices.total}), 0)::text` })
      .from(invoices)
      .where(invoiceCond);
    const [rev] = await this.db
      .select({ value: sql<string>`coalesce(sum(${invoices.total}), 0)::text` })
      .from(invoices)
      .where(and(invoiceCond, gte(invoices.date, monthStartStr)));

    const dayExpr = sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`;
    const signupRows = await this.db
      .select({ day: dayExpr, n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, since)))
      .groupBy(dayExpr);
    const byDay = new Map(signupRows.map((r) => [r.day, r.n]));
    const signupsLast30 = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(since.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return { date, count: byDay.get(date) ?? 0 };
    });

    const health = {
      api: 'ok' as 'ok' | 'error',
      db: await this.probe(() => this.db.execute(sql`select 1`)),
      redis: await this.probe(() => this.redis.ping()),
    };

    return {
      totalTenants: t.n,
      totalCompanies: c.n,
      totalUsers: u.n,
      totalInvoices: inv.n,
      totalInvoiceValue: inv.value,
      revenueThisMonth: rev.value,
      signupsLast30,
      health,
    };
  }

  private async probe(fn: () => Promise<unknown>): Promise<'ok' | 'error'> {
    try {
      await fn();
      return 'ok';
    } catch {
      return 'error';
    }
  }

  async listTenants(q: SearchQueryDto) {
    const conds: SQL[] = [isNull(tenants.deletedAt)];
    if (q.search) conds.push(ilike(tenants.name, `%${q.search}%`));
    const where = and(...conds);
    const p = page(q);
    const rows = await this.db
      .select({
        id: tenants.id,
        name: tenants.name,
        plan: tenants.plan,
        isActive: tenants.isActive,
        createdAt: tenants.createdAt,
        companyCount: sql<number>`(select count(*)::int from ${companies} c where c.tenant_id = ${tenants.id} and c.deleted_at is null)`,
        userCount: sql<number>`(select count(*)::int from ${users} u where u.tenant_id = ${tenants.id} and u.deleted_at is null)`,
      })
      .from(tenants)
      .where(where)
      .orderBy(desc(tenants.createdAt))
      .limit(p.limit)
      .offset(p.offset);
    const [{ n }] = await this.db.select({ n: count() }).from(tenants).where(where);
    return {
      items: rows.map(({ isActive, ...r }) => ({ ...r, status: tenantStatus({ isActive, plan: r.plan }) })),
      total: n,
      page: p.page,
      limit: p.limit,
    };
  }

  async getTenant(id: string) {
    const [t] = await this.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .limit(1);
    if (!t) throw new NotFoundException('Tenant not found');

    const cs = await this.db
      .select({ id: companies.id, name: companies.name, trn: companies.trn, isActive: companies.isActive })
      .from(companies)
      .where(and(eq(companies.tenantId, id), isNull(companies.deletedAt)));
    const us = await this.db
      .select(userCols)
      .from(users)
      .where(and(eq(users.tenantId, id), isNull(users.deletedAt)))
      .orderBy(asc(users.createdAt));
    const [inv] = await this.db.select({ n: count() }).from(invoices).where(eq(invoices.tenantId, id));
    const [po] = await this.db.select({ n: count() }).from(purchaseOrders).where(eq(purchaseOrders.tenantId, id));
    const [pr] = await this.db.select({ n: count() }).from(payrollRuns).where(eq(payrollRuns.tenantId, id));

    return {
      tenant: {
        id: t.id,
        name: t.name,
        email: (t.settings as { email?: string } | null)?.email ?? null,
        plan: t.plan,
        status: tenantStatus(t),
        createdAt: t.createdAt,
      },
      companies: cs,
      users: us,
      usage: { invoices: inv.n, purchaseOrders: po.n, payrollRuns: pr.n },
    };
  }

  async setTenantActive(id: string, active: boolean) {
    const [t] = await this.db
      .update(tenants)
      .set({ isActive: active, updatedAt: new Date() })
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .returning({ id: tenants.id });
    if (!t) throw new NotFoundException('Tenant not found');
    if (!active) await this.revokeTenantSessions(id);
    return { ok: true, status: active ? 'active' : 'suspended' };
  }

  async deleteTenant(id: string) {
    const [t] = await this.db
      .update(tenants)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(tenants.id, id), isNull(tenants.deletedAt)))
      .returning({ id: tenants.id });
    if (!t) throw new NotFoundException('Tenant not found');
    await this.revokeTenantSessions(id);
    return { ok: true };
  }

  private async revokeTenantSessions(tenantId: string): Promise<void> {
    await this.db.execute(sql`delete from refresh_tokens where user_id in (select id from users where tenant_id = ${tenantId})`);
  }

  /** Short-lived (15 min) access token for the tenant's admin: tenant_admin preferred, else company_admin. */
  async impersonate(tenantId: string) {
    const [target] = await this.db
      .select(userCols)
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
          eq(users.isActive, true),
          inArray(users.role, [UserRole.TENANT_ADMIN, UserRole.COMPANY_ADMIN]),
        ),
      )
      .orderBy(sql`case when ${users.role} = 'tenant_admin' then 0 else 1 end`, asc(users.createdAt))
      .limit(1);
    if (!target) throw new NotFoundException('No active admin user found for this tenant');

    const payload: AccessTokenPayload = {
      sub: target.id,
      tenantId: target.tenantId,
      companyId: target.companyId,
      role: target.role as UserRole,
    };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: IMPERSONATION_TTL_S });
    return {
      accessToken,
      expiresIn: IMPERSONATION_TTL_S,
      target: { id: target.id, email: target.email, role: target.role },
    };
  }

  /**
   * Creates the first company_admin for a tenant that has no active admin yet.
   * Returns a generated temporary password (shown once; the caller must rotate it).
   */
  async bootstrapTenantAdmin(tenantId: string, dto: BootstrapTenantAdminDto) {
    const [t] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!t) throw new NotFoundException('Tenant not found');

    const [existingAdmin] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
          inArray(users.role, [UserRole.TENANT_ADMIN, UserRole.COMPANY_ADMIN]),
        ),
      )
      .limit(1);
    if (existingAdmin) throw new ConflictException('Tenant already has an admin user');

    const pw = tempPassword();
    try {
      const [created] = await this.db
        .insert(users)
        .values({
          tenantId,
          companyId: null,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.COMPANY_ADMIN,
          passwordHash: await argon2.hash(pw),
        })
        .returning({ id: users.id, email: users.email });
      return { userId: created.id, email: created.email, tempPassword: pw };
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new ConflictException('Email already registered');
      throw e;
    }
  }

  async listCompanies(q: SearchQueryDto) {
    const conds: SQL[] = [isNull(companies.deletedAt)];
    if (q.search) conds.push(or(ilike(companies.name, `%${q.search}%`), ilike(companies.trn, `%${q.search}%`))!);
    const where = and(...conds);
    const p = page(q);
    const items = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        tenantId: companies.tenantId,
        tenantName: tenants.name,
        trn: companies.trn,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .leftJoin(tenants, eq(companies.tenantId, tenants.id))
      .where(where)
      .orderBy(desc(companies.createdAt))
      .limit(p.limit)
      .offset(p.offset);
    const [{ n }] = await this.db.select({ n: count() }).from(companies).where(where);
    // Platform is UAE-only; country is fixed until companies carry a country column
    return { items: items.map((c) => ({ ...c, country: 'AE' })), total: n, page: p.page, limit: p.limit };
  }

  async setCompanyActive(id: string, active: boolean) {
    const [c] = await this.db
      .update(companies)
      .set({ isActive: active, updatedAt: new Date() })
      .where(and(eq(companies.id, id), isNull(companies.deletedAt)))
      .returning({ id: companies.id });
    if (!c) throw new NotFoundException('Company not found');
    if (!active) await this.db.execute(sql`delete from refresh_tokens where user_id in (select id from users where company_id = ${id})`);
    return { ok: true, isActive: active };
  }

  async listUsers(q: SearchQueryDto) {
    const conds: SQL[] = [isNull(users.deletedAt)];
    if (q.search) {
      conds.push(
        or(
          ilike(users.email, `%${q.search}%`),
          ilike(users.firstName, `%${q.search}%`),
          ilike(users.lastName, `%${q.search}%`),
        )!,
      );
    }
    const where = and(...conds);
    const p = page(q);
    const items = await this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        tenantName: tenants.name,
        companyName: companies.name,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(p.limit)
      .offset(p.offset);
    const [{ n }] = await this.db.select({ n: count() }).from(users).where(where);
    return { items, total: n, page: p.page, limit: p.limit };
  }

  /** Returns the new temporary password once; all existing sessions for the user are revoked. */
  async resetUserPassword(id: string) {
    const pw = tempPassword();
    const [u] = await this.db
      .update(users)
      .set({ passwordHash: await argon2.hash(pw), updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (!u) throw new NotFoundException('User not found');
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    return { tempPassword: pw };
  }

  async setUserRole(id: string, role: UserRole) {
    const [u] = await this.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning(userCols);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async setUserSuspended(id: string, suspended: boolean) {
    const [u] = await this.db
      .update(users)
      .set({ isActive: !suspended, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id });
    if (!u) throw new NotFoundException('User not found');
    if (suspended) await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    return { ok: true, isActive: !suspended };
  }

  private async ensureSettingsRow(): Promise<void> {
    await this.db.insert(platformSettings).values({ id: 1 }).onConflictDoNothing();
  }

  async getSettings() {
    await this.ensureSettingsRow();
    const [s] = await this.db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
    const { smtpPass, ...rest } = s;
    return { ...rest, smtpPassSet: Boolean(smtpPass) };
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    await this.ensureSettingsRow();
    const { smtpPass, defaultVatRate, ...rest } = dto;
    const values = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (defaultVatRate !== undefined) Object.assign(values, { defaultVatRate: String(defaultVatRate) });
    // Empty/absent password keeps the stored one
    if (smtpPass) Object.assign(values, { smtpPass });
    await this.db
      .update(platformSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(platformSettings.id, 1));
    return this.getSettings();
  }
}
