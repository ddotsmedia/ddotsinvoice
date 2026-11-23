import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { companies, Db, refreshTokens, tenants, users } from '@ddotsinvoice/db';
import { AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { ADMIN_DB } from '../../infra/drizzle.module';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

type UserRow = typeof users.$inferSelect;
const publicUser = ({ passwordHash, mfaSecret, ...rest }: UserRow) => rest;

@Injectable()
export class AuthService {
  constructor(
    @Inject(ADMIN_DB) private readonly db: Db,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isActive, true), isNull(users.deletedAt)))
      .limit(1);
    if (!user || !(await argon2.verify(user.passwordHash, password).catch(() => false))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.tenantId) {
      const [tenant] = await this.db
        .select({ isActive: tenants.isActive })
        .from(tenants)
        .where(and(eq(tenants.id, user.tenantId), isNull(tenants.deletedAt)))
        .limit(1);
      if (!tenant?.isActive) throw new UnauthorizedException('Account suspended');
    }
    if (user.companyId) {
      const [company] = await this.db
        .select({ isActive: companies.isActive })
        .from(companies)
        .where(and(eq(companies.id, user.companyId), isNull(companies.deletedAt)))
        .limit(1);
      if (company && !company.isActive) throw new UnauthorizedException('Company suspended');
    }
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return this.issue(user);
  }

  async refresh(token: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, hashToken(token)), gt(refreshTokens.expiresAt, new Date())))
      .limit(1);
    if (!row) throw new UnauthorizedException();

    // refreshTokens has no RLS; now query users with tenant context if available.
    // row.tenantId may be null (platform_admin) or a tenant UUID (regular user).
    let user: UserRow | undefined;
    if (row.tenantId) {
      [user] = await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${row.tenantId!}, true)`);
        return tx.select().from(users).where(and(eq(users.id, row.userId), eq(users.isActive, true), isNull(users.deletedAt))).limit(1);
      });
    } else {
      // platform_admin or legacy token without tenantId: rely on platform_admin_bypass RLS policy
      [user] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.id, row.userId), eq(users.isActive, true), isNull(users.deletedAt)))
        .limit(1);
    }
    if (!user) throw new UnauthorizedException();

    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)); // rotate
    return this.issue(user);
  }

  async logout(userId: string, tokenHash: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tokenHash, tokenHash)));
  }

  async registerTenant(dto: { tenantName: string; firstName: string; lastName: string; email: string; password: string; phone?: string; country?: string; industry?: string; companySize?: string; referralSource?: string }) {
    const email = dto.email.toLowerCase();
    // Check email uniqueness
    const [existing] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new ConflictException('Email already in use');

    const slug = dto.tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100) + '-' + Math.random().toString(36).slice(2, 7);
    const passwordHash = await argon2.hash(dto.password);

    // Create tenant + admin user in a transaction
    const tenantSettings = {
      country: dto.country || null,
      industry: dto.industry || null,
      companySize: dto.companySize || null,
      referralSource: dto.referralSource || null,
    };
    const [tenant] = await this.db.insert(tenants).values({ slug, name: dto.tenantName, plan: 'starter', isActive: true, settings: tenantSettings }).returning();
    const [user] = await this.db.insert(users).values({
      tenantId: tenant.id,
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'company_admin',
      isActive: true,
    }).returning();

    return this.issue(user);
  }

  async me(actor: AccessTokenPayload) {
    const userId = actor.sub;
    const tenantId = actor.tenantId;

    let row: UserRow | undefined;
    if (tenantId) {
      // Regular user: set tenant context so RLS tenant_isolation policy is satisfied.
      // Migration 0020 ensures the policy uses current_setting(..., true) so it returns
      // NULL (not throws) when app.tenant_id is unset on a fresh connection.
      [row] = await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        // Let RLS enforce tenant isolation; only filter by user id here.
        return tx.select().from(users).where(eq(users.id, userId)).limit(1);
      });
    } else {
      // platform_admin: tenant_id IS NULL.
      // Migration 0017/0018 platform_admin_bypass PERMISSIVE policy makes rows with
      // tenant_id IS NULL visible. Migration 0020 prevents tenant_isolation from throwing
      // when app.tenant_id is not set (returns NULL → false, not an error).
      [row] = await this.db.select().from(users).where(and(eq(users.id, userId), isNull(users.tenantId))).limit(1);
    }
    if (!row) throw new UnauthorizedException('User not found');
    return publicUser(row);
  }

  /** Creates a tenant for a user who has no tenantId (e.g. created via super-admin without tenant) */
  async claimTenant(userId: string, tenantName: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException();
    if (user.tenantId) return this.issue(user); // already has tenant, just re-issue

    const slug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 100) + '-' + Math.random().toString(36).slice(2, 7);
    const [tenant] = await this.db.insert(tenants).values({ slug, name: tenantName, plan: 'starter', isActive: true }).returning();
    const [updated] = await this.db.update(users).set({ tenantId: tenant.id, role: 'company_admin' }).where(eq(users.id, userId)).returning();
    return this.issue(updated);
  }

  async issue(user: UserRow) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      companyId: user.companyId,
      role: user.role as UserRole,
    };
    const refreshToken = randomBytes(32).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tenantId: user.tenantId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      user: publicUser(user),
    };
  }
}
