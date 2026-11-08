import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JournalsService } from './journals.service';
import { CreateJournalDto, JournalQueryDto, UpdateJournalDto } from './journals.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/journals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
export class JournalsController {
  constructor(private readonly journals: JournalsService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: JournalQueryDto) {
    return this.journals.list(actor, q);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.getById(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateJournalDto) {
    return this.journals.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJournalDto,
  ) {
    return this.journals.update(actor, id, dto);
  }

  @Post(':id/post')
  post(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.post(actor, id);
  }

  @Post(':id/reverse')
  reverse(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.reverse(actor, id);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.journals.delete(actor, id);
  }
}
