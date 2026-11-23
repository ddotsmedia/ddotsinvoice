import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './invitations.dto';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.COMPANY_ADMIN))
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload) {
    return this.invitations.list(actor);
  }

  @Delete(':id')
  @HttpCode(200)
  revoke(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invitations.revoke(actor, id);
  }
}
