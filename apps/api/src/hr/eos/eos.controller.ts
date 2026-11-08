import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { EndOfServiceService } from './eos.service';

class CalculateEosDto {
  @IsUUID() employeeId!: string;
}

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr/eos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.HR_PAYROLL))
export class EndOfServiceController {
  constructor(private readonly eos: EndOfServiceService) {}

  @Post('calculate')
  calculate(@CurrentUser() a: AccessTokenPayload, @Body() dto: CalculateEosDto) {
    return this.eos.calculate(a, dto.employeeId);
  }

  @Get(':id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eos.findOne(a, id);
  }

  @Post(':id/approve')
  @Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
  approve(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eos.approve(a, id);
  }

  @Post(':id/pay')
  @Roles(...rolesAtOrAbove(UserRole.ACCOUNTANT))
  pay(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.eos.pay(a, id);
  }
}
