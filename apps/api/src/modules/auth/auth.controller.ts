import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { AuthService, hashToken } from './auth.service';
import { LoginDto, RegisterTenantDto } from './auth.dto';
import { InvitationsService } from '../invitations/invitations.service';
import { AcceptInviteDto } from '../invitations/invitations.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

const COOKIE = 'refresh_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // Shared across subdomains (e.g. .ddinvoice.com) so admin.ddinvoice.com can read the cookie set by the API host
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: 7 * 24 * 60 * 60,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
  ) {}

  @Post('register-tenant')
  @HttpCode(201)
  @Throttle({ 'auth-register': { ttl: 60 * 60 * 1000, limit: 3 } })
  async registerTenant(@Body() dto: RegisterTenantDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken, user } = await this.auth.registerTenant(dto);
    res.setCookie(COOKIE, refreshToken, COOKIE_OPTS);
    return { accessToken, user };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ 'auth-login': { ttl: 15 * 60 * 1000, limit: 5 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto.email.toLowerCase(), dto.password);
    res.setCookie(COOKIE, refreshToken, COOKIE_OPTS);
    return { accessToken, user };
  }

  // Public: the single-use invitation token is the credential
  @Post('accept-invite')
  @HttpCode(200)
  @Throttle({ 'auth-login': { ttl: 15 * 60 * 1000, limit: 5 } })
  async acceptInvite(@Body() dto: AcceptInviteDto, @Res({ passthrough: true }) res: FastifyReply) {
    const created = await this.invitations.accept(dto);
    const { accessToken, refreshToken, user } = await this.auth.issue(created);
    res.setCookie(COOKIE, refreshToken, COOKIE_OPTS);
    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(200)
  @SkipThrottle({ 'auth-login': true, 'auth-register': true })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const token = req.cookies[COOKIE];
    if (!token) throw new UnauthorizedException();
    const { accessToken, refreshToken, user } = await this.auth.refresh(token);
    res.setCookie(COOKIE, refreshToken, COOKIE_OPTS);
    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(
    @CurrentUser() actor: AccessTokenPayload,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = req.cookies[COOKIE];
    if (token) await this.auth.logout(actor.sub, hashToken(token));
    res.clearCookie(COOKIE, { path: '/', domain: process.env.COOKIE_DOMAIN || undefined });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle({ 'auth-login': true, 'auth-register': true })
  me(@CurrentUser() actor: AccessTokenPayload) {
    return this.auth.me(actor);
  }

  /** One-time: attach a tenant to a user who was created without one */
  @Post('claim-tenant')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle({ 'auth-login': true, 'auth-register': true })
  async claimTenant(
    @CurrentUser() actor: AccessTokenPayload,
    @Body() body: { tenantName: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { accessToken, refreshToken, user } = await this.auth.claimTenant(actor.sub, body.tenantName || 'My Business');
    res.setCookie(COOKIE, refreshToken, COOKIE_OPTS);
    return { accessToken, user };
  }
}
