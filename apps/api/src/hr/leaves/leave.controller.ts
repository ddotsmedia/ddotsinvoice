import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { Roles } from '../../modules/auth/roles.decorator';
import { RolesGuard } from '../../modules/auth/roles.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { LeaveService } from './leave.service';
import { LeaveQueryDto, LeaveRequestDto, LeaveTypeDto } from './leave.dto';

@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.HR_PAYROLL))
export class LeaveController {
  constructor(private readonly leaves: LeaveService) {}

  @Post('leave-types')
  createType(@CurrentUser() a: AccessTokenPayload, @Body() dto: LeaveTypeDto) {
    return this.leaves.createType(a, dto);
  }

  @Get('leave-types')
  listTypes(@CurrentUser() a: AccessTokenPayload) {
    return this.leaves.listTypes(a);
  }

  @Post('leaves/request')
  request(@CurrentUser() a: AccessTokenPayload, @Body() dto: LeaveRequestDto) {
    return this.leaves.createRequest(a, dto);
  }

  @Get('leaves')
  list(@CurrentUser() a: AccessTokenPayload, @Query() q: LeaveQueryDto) {
    return this.leaves.list(a, q);
  }

  @Get('leaves/balances/:employeeId')
  balances(@CurrentUser() a: AccessTokenPayload, @Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.leaves.balances(a, employeeId);
  }

  @Get('leaves/:id')
  get(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.leaves.findOne(a, id);
  }

  @Post('leaves/:id/approve')
  approve(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.leaves.approve(a, id);
  }

  @Post('leaves/:id/reject')
  reject(@CurrentUser() a: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.leaves.reject(a, id);
  }
}
