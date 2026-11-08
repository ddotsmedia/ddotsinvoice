import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '@ddotsinvoice/shared';

// Applies the tenant-admin company switch (X-Company-Id, set by PermissionsGuard) so every service sees the active company
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
  const req = ctx.switchToHttp().getRequest<{ user: AccessTokenPayload; activeCompanyId?: string }>();
  return req.activeCompanyId ? { ...req.user, companyId: req.activeCompanyId } : req.user;
});
