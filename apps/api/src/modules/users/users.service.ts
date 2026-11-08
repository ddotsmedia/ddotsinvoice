import { ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { and, count, eq, isNull, type SQL } from 'drizzle-orm';
import { companies, Db, Tx, users, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload, ROLE_RANK, UserRole } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { PageQueryDto, requireTenant } from '../../common/tenant';
import { InviteUserDto, UpdateRoleDto, UpdateUserDto } from './users.dto';

// Never select passwordHash / mfaSecret
const safeCols = {
  id: users.id,
  tenantId: users.tenantId,
  companyId: users.companyId,
  branchId: users.branchId,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  mfaEnabled: users.mfaEnabled,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    const conds: SQL[] = [eq(users.tenantId, tenantId), isNull(users.deletedAt)];
    if (actor.companyId) conds.push(eq(users.companyId, actor.companyId));
    return { tenantId, where: and(...conds) };
  }

  list(actor: AccessTokenPayload, q: PageQueryDto) {
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx.select(safeCols).from(users).where(where).limit(q.limit).offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(users).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  get(actor: AccessTokenPayload, id: string) {
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.find(tx, where, id));
  }

  async invite(actor: AccessTokenPayload, dto: InviteUserDto) {
    this.assertCanAssign(actor, dto.role);
    const { tenantId } = this.scope(actor);
    const companyId = actor.companyId ?? dto.companyId ?? null;
    const passwordHash = await argon2.hash(randomBytes(18).toString('base64url'));
    try {
      const row = await withTenant(this.db, tenantId, async (tx) => {
        if (companyId) {
          // RLS hides companies from other tenants
          const [c] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).limit(1);
          if (!c) throw new NotFoundException('Company not found');
        }
        const [created] = await tx
          .insert(users)
          .values({
            tenantId,
            companyId,
            branchId: dto.branchId,
            email: dto.email.toLowerCase(),
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role,
            passwordHash,
          })
          .returning(safeCols);
        return created;
      });
      this.logger.log(`Welcome email placeholder: ${row.email}`);
      return row;
    } catch (e) {
      if ((e as { code?: string }).code === '23505') throw new ConflictException('Email already registered');
      throw e;
    }
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateUserDto) {
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      this.assertCanManage(actor, await this.find(tx, where, id));
      const [row] = await tx
        .update(users)
        .set({ ...dto, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning(safeCols);
      return row;
    });
  }

  changeRole(actor: AccessTokenPayload, id: string, dto: UpdateRoleDto) {
    if (id === actor.sub) throw new ForbiddenException('Cannot change your own role');
    this.assertCanAssign(actor, dto.role);
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      this.assertCanManage(actor, await this.find(tx, where, id));
      const [row] = await tx
        .update(users)
        .set({ role: dto.role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning(safeCols);
      return row;
    });
  }

  remove(actor: AccessTokenPayload, id: string) {
    if (id === actor.sub) throw new ForbiddenException('Cannot delete yourself');
    const { tenantId, where } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      this.assertCanManage(actor, await this.find(tx, where, id));
      const [row] = await tx
        .update(users)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(users.id, id))
        .returning(safeCols);
      return row;
    });
  }

  private async find(tx: Tx, where: SQL | undefined, id: string) {
    const [row] = await tx.select(safeCols).from(users).where(and(where, eq(users.id, id))).limit(1);
    if (!row) throw new NotFoundException('User not found');
    return row;
  }

  // Cannot manage users more privileged than yourself
  private assertCanManage(actor: AccessTokenPayload, target: { role: string }): void {
    if (ROLE_RANK[target.role as UserRole] < ROLE_RANK[actor.role]) {
      throw new ForbiddenException('Cannot manage a user with a higher role');
    }
  }

  // Cannot elevate above your own role
  private assertCanAssign(actor: AccessTokenPayload, role: UserRole): void {
    if (ROLE_RANK[role] < ROLE_RANK[actor.role]) {
      throw new ForbiddenException('Cannot assign a role above your own');
    }
  }
}
