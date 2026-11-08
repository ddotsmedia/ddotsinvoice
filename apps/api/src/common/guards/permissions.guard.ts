import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull, or } from 'drizzle-orm';
import { companies, Db, rolePermissions } from '@ddotsinvoice/db';
import { AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { ADMIN_DB } from '../../infra/drizzle.module';

export const PERMISSIONS_KEY = 'permissions';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Req = {
  user?: AccessTokenPayload;
  activeCompanyId?: string;
  headers: Record<string, string | undefined>;
};

/** Usage: @RequirePermission('invoicing:post') — module:action codes from role_permissions */
export const RequirePermission = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);

/**
 * Global guard. Runs before route-level guards, so it verifies the bearer token itself when
 * req.user is not yet populated. Routes without @RequirePermission pass through untouched.
 * super_admin bypasses all checks.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(ADMIN_DB) private readonly db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Req>();
    if (!req.user) {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      try {
        if (token) req.user = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      } catch {
        if (!required?.length) return true; // route guards reject invalid tokens where auth is required
        throw new UnauthorizedException();
      }
      if (!req.user) {
        if (!required?.length) return true;
        throw new UnauthorizedException();
      }
    }

    const actor = req.user;
    // Tenant admins may act on any company of their own tenant via X-Company-Id (company switcher)
    const companyHeader = req.headers['x-company-id'];
    if (actor.role === UserRole.TENANT_ADMIN && companyHeader) {
      await this.assertCompanyInTenant(actor, companyHeader);
      req.activeCompanyId = companyHeader;
    }

    if (!required?.length) return true;
    if (actor.role === UserRole.SUPER_ADMIN) return true;

    const granted = await this.grantedCodes({ ...actor, companyId: req.activeCompanyId ?? actor.companyId });
    if (!required.every((code) => granted.has(code))) {
      throw new ForbiddenException(`Missing permission: ${required.join(', ')}`);
    }
    return true;
  }

  private async assertCompanyInTenant(actor: AccessTokenPayload, companyId: string): Promise<void> {
    if (!UUID.test(companyId) || !actor.tenantId) throw new ForbiddenException('Invalid company');
    const [c] = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, actor.tenantId), isNull(companies.deletedAt)))
      .limit(1);
    if (!c) throw new ForbiddenException('Company not found in tenant');
  }

  /** Company override rows (if any exist for this role) replace platform defaults. */
  private async grantedCodes(actor: AccessTokenPayload): Promise<Set<string>> {
    const scope = actor.companyId
      ? or(isNull(rolePermissions.companyId), eq(rolePermissions.companyId, actor.companyId))
      : isNull(rolePermissions.companyId);
    const rows = await this.db
      .select({ companyId: rolePermissions.companyId, code: rolePermissions.permissionCode })
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, actor.role), scope));
    const overrides = rows.filter((r) => r.companyId !== null);
    const chosen = overrides.length ? overrides : rows;
    return new Set(chosen.map((r) => r.code));
  }
}
