import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { ADMIN_DB, DB } from '../../infra/drizzle.module';
import { Db, invoices, notifications, users, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { requireTenant } from '../../common/tenant';

export interface NewNotification {
  tenantId: string;
  userId: string;
  companyId: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

// Anything with insert(): the app pool, a transaction, or the admin pool
type Inserter = Pick<Db, 'insert'>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ADMIN_DB) private readonly adminDb: Db,
  ) {}

  /** For other services: creates one notification in its own tenant-scoped transaction. */
  create(tenantId: string, userId: string, companyId: string | null, type: string, title: string, body?: string, link?: string) {
    return withTenant(this.db, tenantId, (tx) => this.insertMany(tx, [{ tenantId, userId, companyId, type, title, body, link }]));
  }

  /** Bulk insert on a caller-supplied executor (so it can join an existing transaction). */
  async insertMany(exec: Inserter, rows: NewNotification[]): Promise<void> {
    if (rows.length === 0) return;
    await exec.insert(notifications).values(rows);
  }

  async list(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx
        .select()
        .from(notifications)
        .where(eq(notifications.userId, actor.sub))
        .orderBy(notifications.isRead, desc(notifications.createdAt)) // unread first
        .limit(20);
      const [{ unread }] = await tx
        .select({ unread: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, actor.sub), eq(notifications.isRead, false)));
      return { items, unreadCount: unread };
    });
  }

  async markRead(actor: AccessTokenPayload, id: string) {
    const tenantId = requireTenant(actor.tenantId);
    await withTenant(this.db, tenantId, (tx) =>
      tx.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, actor.sub))),
    );
    return { ok: true };
  }

  async markAllRead(actor: AccessTokenPayload) {
    const tenantId = requireTenant(actor.tenantId);
    await withTenant(this.db, tenantId, (tx) =>
      tx.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, actor.sub), eq(notifications.isRead, false))),
    );
    return { ok: true };
  }

  /**
   * Daily 08:00: open invoices past their due date become 'overdue'; each company's
   * admins/accountants get one summary notification. The UPDATE ... RETURNING makes this
   * idempotent, so overlapping runs (or several API replicas) never double-notify.
   */
  @Cron('0 8 * * *')
  async markOverdueInvoices(): Promise<void> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const flipped = await this.adminDb
        .update(invoices)
        .set({ status: 'overdue', updatedAt: new Date() })
        .where(and(eq(invoices.type, 'invoice'), inArray(invoices.status, ['sent', 'posted', 'partially_paid']), lt(invoices.dueDate, today)))
        .returning({ tenantId: invoices.tenantId, companyId: invoices.companyId });

      const byCompany = new Map<string, { tenantId: string; count: number }>();
      for (const r of flipped) {
        const e = byCompany.get(r.companyId) ?? { tenantId: r.tenantId, count: 0 };
        e.count++;
        byCompany.set(r.companyId, e);
      }
      for (const [companyId, { tenantId, count }] of byCompany) {
        const recipients = await this.adminDb
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.companyId, companyId), inArray(users.role, ['company_admin', 'accountant']), eq(users.isActive, true), isNull(users.deletedAt)));
        await this.insertMany(this.adminDb, recipients.map((u) => ({
          tenantId, userId: u.id, companyId, type: 'invoice_overdue',
          title: `${count} invoice${count === 1 ? '' : 's'} now overdue`,
          body: 'Past their due date and marked overdue. Follow up with the customer.',
          link: '/dashboard/invoicing/invoices?status=overdue',
        })));
      }
      this.logger.log(`Overdue sweep: ${flipped.length} invoice(s) updated`);
    } catch (e) {
      this.logger.error('Overdue sweep failed', e instanceof Error ? e.stack : String(e));
    }
  }
}
