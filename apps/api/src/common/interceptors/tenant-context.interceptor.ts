import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AccessTokenPayload } from '@ddotsinvoice/shared';

// Rejects authenticated non-platform requests without a tenant.
// Tenant isolation itself is enforced per transaction via withTenant() (RLS + set_config).
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = ctx.switchToHttp().getRequest<{ user?: AccessTokenPayload }>().user;
    if (user && user.role !== 'platform_admin' && !user.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }
    return next.handle();
  }
}
