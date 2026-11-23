import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { AccessTokenPayload, rolesAtOrAbove, UserRole } from '@ddotsinvoice/shared';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { BulkActionDto, BulkDeleteDto, CreateInvoiceDto, CreditNoteDto, InvoiceQueryDto, SendEmailDto, UpdateInvoiceDto } from './invoices.dto';

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoicing/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...rolesAtOrAbove(UserRole.SALES))
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentUser() actor: AccessTokenPayload, @Query() q: InvoiceQueryDto) {
    return this.invoices.list(actor, q);
  }

  @Get(':id')
  get(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.getById(actor, id);
  }

  @Get(':id/pdf')
  async pdf(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: FastifyReply,
  ) {
    const { buffer, filename } = await this.invoices.pdf(actor, id);
    res
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename=${filename}`)
      .send(buffer);
  }

  @Post()
  create(@CurrentUser() actor: AccessTokenPayload, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(actor, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoices.update(actor, id, dto);
  }

  @Post(':id/post')
  post(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.post(actor, id);
  }

  @Post(':id/void')
  void(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.void(actor, id);
  }

  @Post(':id/convert')
  convert(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.convert(actor, id);
  }

  @Post(':id/credit-note')
  creditNote(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreditNoteDto,
  ) {
    return this.invoices.createCreditNote(actor, id, dto);
  }

  @Post(':id/send-email')
  sendEmail(
    @CurrentUser() actor: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendEmailDto,
  ) {
    return this.invoices.sendEmail(actor, id, dto);
  }

  @Patch('bulk')
  bulkAction(@CurrentUser() actor: AccessTokenPayload, @Body() dto: BulkActionDto) {
    return this.invoices.bulkAction(actor, dto);
  }

  @Delete('bulk')
  bulkDelete(@CurrentUser() actor: AccessTokenPayload, @Body() dto: BulkDeleteDto) {
    return this.invoices.bulkDelete(actor, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() actor: AccessTokenPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.remove(actor, id);
  }
}
