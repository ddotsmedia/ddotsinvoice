import { Controller, Get, Param, Post } from '@nestjs/common';
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

  @Post('invoice/:token/acknowledge')
  acknowledge(@Param('token') token: string) {
    return this.invoices.acknowledgePortalInvoice(token);
  }
}
