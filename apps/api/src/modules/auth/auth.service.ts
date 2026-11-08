import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Db, refreshTokens, users } from '@ddotsinvoice/db';
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

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, row.userId), eq(users.isActive, true), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw new UnauthorizedException();

    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)); // rotate
    return this.issue(user);
  }

  async logout(userId: string, tokenHash: string): Promise<void> {
    await this.db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.tokenHash, tokenHash)));
  }

  async me(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }

  private async issue(user: UserRow) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      companyId: user.companyId,
      role: user.role as UserRole,
    };
    const refreshToken = randomBytes(32).toString('base64url');
    await this.db.insert(refreshTokens).values({
      userId: user.id,
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
