import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { rolesAtOrAbove, AccessTokenPayload, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PageQueryDto } from '../../common/tenant';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './branches.dto';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.COMPANY_ADMIN))
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: PageQueryDto) {
    return this.branches.list(actor, q);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateBranchDto) {
    return this.branches.create(actor, dto);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.branches.get(actor, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(actor, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.branches.remove(actor, id);
  }
}
