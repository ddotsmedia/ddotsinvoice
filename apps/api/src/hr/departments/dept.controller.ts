import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { DepartmentsService } from './dept.service';
import { CreateDepartmentDto, DepartmentQueryDto, UpdateDepartmentDto } from './dept.dto';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr/departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.HR_PAYROLL))
export class DepartmentsController {
  constructor(private readonly depts: DepartmentsService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateDepartmentDto) {
    return this.depts.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: DepartmentQueryDto) {
    return this.depts.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.depts.findOne(a, id);
  }

  @Patch(':id')
  update(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.depts.update(a, id, dto);
  }
}
