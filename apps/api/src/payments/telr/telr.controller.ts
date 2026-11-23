import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/current-user.decorator';
import { TelrService } from './telr.service';

@ApiTags('payments')
@Controller('payments/telr')
export class TelrController {
  constructor(private readonly telr: TelrService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createOrder(@CurrentUser() actor: AccessTokenPayload, @Body() body: { invoiceId: string }) {
    return this.telr.createOrder(actor, body.invoiceId);
  }

  @Post('callback')
  callback(@Body() body: Record<string, string>) {
    return this.telr.handleCallback(body);
  }

  @Post('status')
  @UseGuards(JwtAuthGuard)
  status() {
    return { telrEnabled: this.telr.isConfigured() };
  }
}
