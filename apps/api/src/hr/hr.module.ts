import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments/dept.controller';
import { DepartmentsService } from './departments/dept.service';
import { EmployeesController } from './employees/emp.controller';
import { EmployeesService } from './employees/emp.service';
import { LeaveController } from './leaves/leave.controller';
import { LeaveService } from './leaves/leave.service';
import { PayrollController } from './payroll/payroll.controller';
import { PayrollService } from './payroll/payroll.service';
import { EndOfServiceController } from './eos/eos.controller';
import { EndOfServiceService } from './eos/eos.service';

@Module({
  controllers: [DepartmentsController, EmployeesController, LeaveController, PayrollController, EndOfServiceController],
  providers: [DepartmentsService, EmployeesService, LeaveService, PayrollService, EndOfServiceService],
})
export class HrModule {}
