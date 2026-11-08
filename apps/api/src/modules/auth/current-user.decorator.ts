import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '@ddotsinvoice/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload =>
    ctx.switchToHttp().getRequest<{ user: AccessTokenPayload }>().user,
);
