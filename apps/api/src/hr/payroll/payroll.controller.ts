import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { PayrollService } from './payroll.service';
import { GeneratePayrollDto, PayrollQueryDto } from './payroll.dto';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr/payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.HR_PAYROLL))
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('generate')
  generate(@CurrentUser() a: AccessTokenPayload, @Body() dto: GeneratePayrollDto) {
    return this.payroll.generate(a, dto);
  }

  @Get()
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: PayrollQueryDto) {
    return this.payroll.list(a, q);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.findOne(a, id);
  }

  @Post(':id/approve')
  @Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
  approve(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.approve(a, id);
  }

  @Post(':id/pay')
  @Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
  pay(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.pay(a, id);
  }

  @Get(':id/wps')
  async wps(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string, @Res() res: FastifyReply) {
    const { fileName, content } = await this.payroll.wps(a, id);
    res
      .header('Content-Type', 'text/plain; charset=utf-8')
      .header('Content-Disposition', `attachment; filename=${fileName}`)
      .send(content);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.cancel(a, id);
  }

  @Get(':id/summary')
  summary(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.payroll.summary(a, id);
  }
}
