import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { EmployeesService } from './emp.service';
import { CreateEmployeeDto, EmployeeQueryDto, SalaryStructureDto, TerminateDto, UpdateEmployeeDto } from './emp.dto';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.HR_PAYROLL))
export class EmployeesController {
  constructor(private readonly emps: EmployeesService) {}

  @Post()
  create(@CurrentUser() a: AccessTokenPayload, @Body() dto: CreateEmployeeDto) {
    return this.emps.create(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: EmployeeQueryDto) {
    return this.emps.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.emps.findOne(a, id);
  }

  @Patch(':id')
  update(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.emps.update(a, id, dto);
  }

  @Post(':id/terminate')
  terminate(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: TerminateDto) {
    return this.emps.terminate(a, id, dto);
  }

  @Post(':id/salary-structure')
  setSalary(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SalaryStructureDto) {
    return this.emps.setSalary(a, id, dto);
  }

  @Get(':id/salary-structure')
  getSalary(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.emps.getSalary(a, id);
  }
}
