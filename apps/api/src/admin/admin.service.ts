import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { auditLogs, companies, Db, employees, invoices, permissions, refreshTokens, rolePermissions, users, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { AuditQueryDto, ChangeUserRoleDto, COMPANY_ROLES, EDITABLE_PERMISSION_ROLES, InviteUserDto, UpdateCompanyDto, UpdateRolesDto } from './admin.dto';

const POSTED = ['sent', 'posted', 'paid', 'partially_paid', 'overdue'] as const;
const OPEN_AR = ['sent', 'posted', 'partially_paid', 'overdue'] as const;

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

const monthStartStr = (): string => {
  const d = new Date();
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
};

/** Company-scoped administration. Every query runs inside withTenant (RLS) and is filtered to the actor's company. */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  async overview(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    const monthStart = monthStartStr();
    return withTenant(this.db, tenantId, async (tx) => {
      const [company] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      if (!company) throw new NotFoundException('Company not found');
      const [uc] = await tx.select({ n: count() }).from(users).where(and(eq(users.companyId, companyId), isNull(users.deletedAt)));
      const [emp] = await tx
        .select({ n: count() })
        .from(employees)
        .where(and(eq(employees.companyId, companyId), eq(employees.status, 'active')));
      const [rev] = await tx
        .select({ v: sql<string>`coalesce(sum(${invoices.total}), 0)::text` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.type, 'invoice'),
            inArray(invoices.status, [...POSTED]),
            gte(invoices.date, monthStart),
          ),
        );
      const [ar] = await tx
        .select({ v: sql<string>`coalesce(sum(${invoices.balanceDue}), 0)::text` })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), eq(invoices.type, 'invoice'), inArray(invoices.status, [...OPEN_AR])));
      const recentActivity = await tx
        .select({
          id: auditLogs.id,
          createdAt: auditLogs.createdAt,
          action: auditLogs.action,
          module: auditLogs.module,
          recordId: auditLogs.recordId,
          userFirstName: users.firstName,
          userLastName: users.lastName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(eq(auditLogs.companyId, companyId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(10);
      return {
        company: { id: company.id, name: company.name, nameAr: company.nameAr, trn: company.trn, logoUrl: company.logoUrl },
        userCount: uc.n,
        activeEmployees: emp.n,
        thisMonthRevenue: rev.v,
        outstandingReceivables: ar.v,
        recentActivity,
      };
    });
  }

  listUsers(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) =>
      tx
        .select(userCols)
        .from(users)
        .where(and(eq(users.companyId, companyId), isNull(users.deletedAt)))
        .orderBy(asc(users.firstName)),
    );
  }

  /**
   * Creates the user with a temporary password. Email delivery is not wired (no SMTP sender yet),
   * so the temporary password is returned once to the inviting admin.
   */
  async invite(actor: AccessTokenPayload, dto: InviteUserDto) {
    const { tenantId, companyId } = this.scope(actor);
    const pw = randomBytes(9).toString('base64url');
    const [firstName, ...rest] = dto.name.trim().split(/\s+/);
    const lastName = rest.join(' ') || '-';
    const passwordHash = await argon2.hash(pw);
    try {
      const user = await withTenant(this.db, tenantId, async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({ tenantId, companyId, email: dto.email.toLowerCase(), firstName, lastName, role: dto.role, passwordHash })
          .returning(userCols);
        return created;
      });
      this.logger.log(`Invite created for ${user.email}; email delivery not configured`);
      return { user, tempPassword: pw, emailSent: false };
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new ConflictException('Email already registered');
      throw e;
    }
  }

  private async findCompanyUser(tx: Parameters<Parameters<Db['transaction']>[0]>[0], companyId: string, id: string) {
    const [u] = await tx
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, companyId), isNull(users.deletedAt)))
      .limit(1);
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async changeRole(actor: AccessTokenPayload, id: string, dto: ChangeUserRoleDto) {
    if (id === actor.sub) throw new ForbiddenException('You cannot change your own role');
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.findCompanyUser(tx, companyId, id);
      const [u] = await tx.update(users).set({ role: dto.role, updatedAt: new Date() }).where(eq(users.id, id)).returning(userCols);
      return u;
    });
  }

  async setSuspended(actor: AccessTokenPayload, id: string, suspended: boolean) {
    if (id === actor.sub) throw new ForbiddenException('You cannot suspend yourself');
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.findCompanyUser(tx, companyId, id);
      await tx.update(users).set({ isActive: !suspended, updatedAt: new Date() }).where(eq(users.id, id));
      if (suspended) await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
      return { ok: true, isActive: !suspended };
    });
  }

  /** Soft delete: row kept for audit history, login and sessions revoked. */
  async remove(actor: AccessTokenPayload, id: string) {
    if (id === actor.sub) throw new ForbiddenException('You cannot delete yourself');
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await this.findCompanyUser(tx, companyId, id);
      await tx.update(users).set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() }).where(eq(users.id, id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
      return { ok: true };
    });
  }

  private assertOwnCompany(actor: AccessTokenPayload, id: string): string {
    const { companyId } = this.scope(actor);
    if (id !== companyId) throw new ForbiddenException('Not your company');
    return companyId;
  }

  async getCompany(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const [c] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      if (!c) throw new NotFoundException('Company not found');
      return c;
    });
  }

  async updateCompany(actor: AccessTokenPayload, id: string, dto: UpdateCompanyDto) {
    const companyId = this.assertOwnCompany(actor, id);
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, async (tx) => {
      const [current] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      if (!current) throw new NotFoundException('Company not found');

      const set: Record<string, unknown> = { updatedAt: new Date() };
      for (const k of ['name', 'nameAr', 'trn', 'email', 'phone', 'address', 'addressAr', 'logoUrl'] as const) {
        if (dto[k] !== undefined) set[k] = dto[k] === '' ? null : dto[k];
      }
      if (dto.fiscalYearStartMonth !== undefined) {
        set.fiscalYearStart = `${String(dto.fiscalYearStartMonth).padStart(2, '0')}-01`;
      }
      // Payment terms, VAT rate and invoice prefix live in company settings
      const settings: Record<string, unknown> = { ...((current.settings ?? {}) as Record<string, unknown>) };
      if (dto.defaultPaymentTerms !== undefined) settings.defaultPaymentTerms = dto.defaultPaymentTerms;
      if (dto.defaultVatRate !== undefined) settings.defaultVatRate = dto.defaultVatRate;
      if (dto.invoicePrefix !== undefined) settings.invoicePrefix = dto.invoicePrefix;
      set.settings = settings;

      const [updated] = await tx.update(companies).set(set).where(eq(companies.id, companyId)).returning();
      return updated;
    });
  }

  private readonly ROLE_KEYS = COMPANY_ROLES;

  /** Effective permissions per role: company override rows replace platform defaults when present. */
  async roles(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const catalog = await tx.select().from(permissions).orderBy(asc(permissions.module), asc(permissions.action));
      const rows = await tx
        .select({ companyId: rolePermissions.companyId, role: rolePermissions.role, code: rolePermissions.permissionCode })
        .from(rolePermissions)
        .where(or(isNull(rolePermissions.companyId), eq(rolePermissions.companyId, companyId)));
      const matrix: Record<string, string[]> = {};
      for (const role of this.ROLE_KEYS) {
        const forRole = rows.filter((r) => r.role === role);
        const overrides = forRole.filter((r) => r.companyId !== null);
        const chosen = overrides.length ? overrides : forRole;
        matrix[role] = chosen.map((r) => r.code).sort();
      }
      return { catalog, roles: this.ROLE_KEYS, editableRoles: EDITABLE_PERMISSION_ROLES, matrix };
    });
  }

  async updateRoles(actor: AccessTokenPayload, dto: UpdateRolesDto) {
    const { tenantId, companyId } = this.scope(actor);
    const known = await this.db.select({ code: permissions.code }).from(permissions).where(inArray(permissions.code, dto.permissions));
    const unique = [...new Set(dto.permissions)];
    if (known.length !== unique.length) throw new BadRequestException('Unknown permission code');

    await withTenant(this.db, tenantId, async (tx) => {
      await tx.delete(rolePermissions).where(and(eq(rolePermissions.companyId, companyId), eq(rolePermissions.role, dto.role)));
      await tx.insert(rolePermissions).values(unique.map((code) => ({ companyId, role: dto.role, permissionCode: code })));
    });
    return this.roles(actor);
  }

  async auditLog(actor: AccessTokenPayload, q: AuditQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(auditLogs.companyId, companyId)];
    if (q.userId) conds.push(eq(auditLogs.userId, q.userId));
    if (q.module) conds.push(eq(auditLogs.module, q.module));
    if (q.fromDate) conds.push(gte(auditLogs.createdAt, new Date(q.fromDate)));
    if (q.toDate) {
      const end = new Date(q.toDate);
      end.setUTCHours(23, 59, 59, 999);
      conds.push(lte(auditLogs.createdAt, end));
    }
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: auditLogs.id,
          createdAt: auditLogs.createdAt,
          action: auditLogs.action,
          module: auditLogs.module,
          recordId: auditLogs.recordId,
          oldValues: auditLogs.oldValues,
          newValues: auditLogs.newValues,
          ipAddress: auditLogs.ipAddress,
          userId: auditLogs.userId,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);
      const [{ n }] = await tx.select({ n: count() }).from(auditLogs).where(where);
      return { items: rows, total: n, page: q.page, limit: q.limit };
    });
  }
}
