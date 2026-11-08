import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const actor = ctx.switchToHttp().getRequest<{ user?: AccessTokenPayload }>().user;
    if (!actor || !roles.includes(actor.role)) throw new ForbiddenException();
    return true;
  }
}
