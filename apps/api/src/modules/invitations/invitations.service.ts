import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import { Db, invitations, users, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { ADMIN_DB, DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';
import { hashToken } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AcceptInviteDto, CreateInvitationDto } from './invitations.dto';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ADMIN_DB) private readonly adminDb: Db,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private inviteUrl(token: string): string {
    const base = this.config.get<string>('WEB_URL') ?? (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',')[0];
    return `${base.replace(/\/$/, '')}/accept-invite?token=${token}`;
  }

  async create(actor: AccessTokenPayload, dto: CreateInvitationDto) {
    const { tenantId, companyId } = this.scope(actor);
    const email = dto.email.toLowerCase();
    const token = randomBytes(32).toString('hex'); // 64 hex chars, emailed; only its hash is stored
    const expiresAt = new Date(Date.now() + TTL_MS);

    const row = await withTenant(this.db, tenantId, async (tx) => {
      const [existingUser] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
      if (existingUser) throw new ConflictException('A user with this email already exists');
      // A fresh invite replaces any still-pending one for the same address
      await tx.delete(invitations).where(and(eq(invitations.companyId, companyId), eq(invitations.email, email), isNull(invitations.acceptedAt)));
      const [created] = await tx
        .insert(invitations)
        .values({ tenantId, companyId, email, role: dto.role, token: hashToken(token), expiresAt, invitedBy: actor.sub })
        .returning({ id: invitations.id, email: invitations.email, role: invitations.role, expiresAt: invitations.expiresAt, createdAt: invitations.createdAt });
      return created;
    });

    const url = this.inviteUrl(token);
    const emailSent = await this.sendEmail(email, url);
    // Without SMTP the link is only logged (and returned to the inviting admin so they can share it)
    if (!emailSent) this.logger.log(`Invite for ${email}: ${url}`);
    return { ...row, emailSent, ...(emailSent ? {} : { inviteUrl: url }) };
  }

  private async sendEmail(to: string, url: string): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return false;
    try {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      const user = this.config.get<string>('SMTP_USER');
      const transport = nodemailer.createTransport({
        host, port, secure: port === 465,
        auth: user ? { user, pass: this.config.get<string>('SMTP_PASS') ?? '' } : undefined,
      });
      await transport.sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? user ?? 'no-reply@ddotsinvoice.com',
        to,
        subject: "You've been invited to DdotsInvoice",
        text: `You have been invited to join a company on DdotsInvoice.\n\nAccept the invitation (valid for 7 days):\n${url}\n`,
        html: `<p>You have been invited to join a company on DdotsInvoice.</p><p><a href="${url}">Accept the invitation</a> (valid for 7 days).</p>`,
      });
      return true;
    } catch (e) {
      this.logger.error(`Invite email to ${to} failed`, e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  async list(actor: AccessTokenPayload) {
    const { tenantId, companyId } = this.scope(actor);
    const rows = await withTenant(this.db, tenantId, (tx) =>
      tx
        .select({ id: invitations.id, email: invitations.email, role: invitations.role, expiresAt: invitations.expiresAt, acceptedAt: invitations.acceptedAt, createdAt: invitations.createdAt })
        .from(invitations)
        .where(eq(invitations.companyId, companyId))
        .orderBy(desc(invitations.createdAt)),
    );
    const now = Date.now();
    return rows.map((r) => ({ ...r, status: r.acceptedAt ? 'accepted' : r.expiresAt.getTime() < now ? 'expired' : 'pending' }));
  }

  async revoke(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    const deleted = await withTenant(this.db, tenantId, (tx) =>
      tx.delete(invitations).where(and(eq(invitations.id, id), eq(invitations.companyId, companyId), isNull(invitations.acceptedAt))).returning({ id: invitations.id }),
    );
    if (deleted.length === 0) throw new NotFoundException('Pending invitation not found');
    return { ok: true };
  }

  /** Public: consumes the token and creates the user. The caller issues the session tokens. */
  async accept(dto: AcceptInviteDto) {
    const passwordHash = await argon2.hash(dto.password);
    let result: { created: typeof users.$inferSelect; inv: typeof invitations.$inferSelect };
    try {
      result = await this.adminDb.transaction(async (tx) => {
        // Atomic claim: only one concurrent request can flip accepted_at for a valid, unexpired token
        const [claimed] = await tx
          .update(invitations)
          .set({ acceptedAt: new Date() })
          .where(and(eq(invitations.token, hashToken(dto.token)), isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())))
          .returning();
        if (!claimed) throw new BadRequestException('This invitation is invalid or has expired');
        const [created] = await tx
          .insert(users)
          .values({
            tenantId: claimed.tenantId,
            companyId: claimed.companyId,
            email: claimed.email,
            role: claimed.role as typeof users.$inferInsert.role,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            passwordHash,
          })
          .returning();
        return { created, inv: claimed };
      });
    } catch (e) {
      // A unique-email violation rolls the claim back too, so the invitation stays usable
      if ((e as { code?: string }).code === '23505') throw new ConflictException('An account with this email already exists');
      throw e;
    }

    // Best-effort: failing to notify must never fail the sign-up
    const { created, inv } = result;
    try {
      const admins = await this.adminDb
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.companyId, inv.companyId), eq(users.role, 'company_admin'), eq(users.isActive, true), isNull(users.deletedAt)));
      const recipients = [...new Set([inv.invitedBy, ...admins.map((a) => a.id)])].filter((id) => id !== created.id);
      await this.notifications.insertMany(
        this.adminDb,
        recipients.map((userId) => ({
          tenantId: inv.tenantId,
          userId,
          companyId: inv.companyId,
          type: 'invitation_accepted',
          title: `${created.firstName} ${created.lastName} accepted the invitation`,
          body: `${created.email} joined as ${created.role.replace(/_/g, ' ')}.`,
          link: '/dashboard/settings/team',
        })),
      );
    } catch (e) {
      this.logger.error('Failed to create invitation-accepted notification', e instanceof Error ? e.message : String(e));
    }
    return created;
  }
}
