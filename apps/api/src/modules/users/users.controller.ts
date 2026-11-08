import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { rolesAtOrAbove, AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PageQueryDto } from '../../common/tenant';
import { UsersService } from './users.service';
import { InviteUserDto, UpdateRoleDto, UpdateUserDto } from './users.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.COMPANY_ADMIN))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  invite(@CurrentUser() actor: AccessTokenPayload, @Body() dto: InviteUserDto) {
    return this.users.invite(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: PageQueryDto) {
    return this.users.list(actor, q);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.get(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor, id, dto);
  }

  @Patch(':id/role')
  changeRole(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.users.changeRole(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.remove(actor, id);
  }
}
