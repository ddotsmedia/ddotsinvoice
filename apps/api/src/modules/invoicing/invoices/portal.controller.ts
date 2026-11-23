import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';

@ApiTags('portal')
@Controller('portal')
export class PortalController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('invoice/:token')
  getInvoice(@Param('token') token: string) {
    return this.invoices.getPortalInvoice(token);
  }
}
