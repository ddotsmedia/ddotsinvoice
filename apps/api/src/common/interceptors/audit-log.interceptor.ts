import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { auditLogs, Db } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { ADMIN_DB } from '../../infra/drizzle.module';

const MUTATIONS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_KEY = /password|secret|token|hash/i;

const redact = (body: unknown): Record<string, unknown> | null => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[redacted]' : v]));
};

type AuditReq = FastifyRequest & {
  user?: AccessTokenPayload;
  params?: Record<string, string>;
  routeOptions?: { url?: string };
};

/**
 * Global. Records every successful authenticated POST/PATCH/PUT/DELETE into audit_logs.
 * newValues = request body (secrets redacted). oldValues is not captured generically.
 * Writes use the admin pool so an audit failure can never break the request (errors are logged only).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(@Inject(ADMIN_DB) private readonly db: Db) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuditReq>();
    if (!MUTATIONS.has(req.method) || !req.user) return next.handle();

    const actor = req.user;
    const route = (req.routeOptions?.url ?? req.url.split('?')[0]).slice(0, 80);
    const id = req.params?.id;
    const module = route.split('/').filter(Boolean)[0]?.slice(0, 30) ?? null;
    const body = req.method === 'DELETE' ? null : redact(req.body);

    return next.handle().pipe(
      tap({
        next: () => {
          this.db
            .insert(auditLogs)
            .values({
              tenantId: actor.tenantId,
              companyId: actor.companyId,
              userId: actor.sub,
              action: `${req.method} ${route}`.slice(0, 100),
              module,
              recordId: id && UUID.test(id) ? id : null,
              newValues: body,
              ipAddress: (req.ip ?? '').slice(0, 45) || null,
            })
            .catch((e: unknown) => this.logger.error(`audit write failed: ${String(e)}`));
        },
      }),
    );
  }
}
