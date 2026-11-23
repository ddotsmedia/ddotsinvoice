import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { Db, invoices, withTenant } from '@ddotsinvoice/db';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../common/tenant';

@Injectable()
export class TelrService {
  private readonly logger = new Logger(TelrService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
  ) {}

  private getCredentials() {
    const storeId = this.config.get<string>('TELR_STORE_ID');
    const authKey = this.config.get<string>('TELR_AUTH_KEY');
    if (!storeId || !authKey) {
      throw new ServiceUnavailableException('Telr not configured — add TELR_STORE_ID and TELR_AUTH_KEY to environment');
    }
    return { storeId, authKey };
  }

  async createOrder(actor: AccessTokenPayload, invoiceId: string): Promise<{ paymentUrl: string; cartId: string }> {
    const { storeId, authKey } = this.getCredentials();
    const tenantId = requireTenant(actor.tenantId);

    const [inv] = await withTenant(this.db, tenantId, (tx) =>
      tx.select({ id: invoices.id, number: invoices.number, total: invoices.total, currency: invoices.currency, status: invoices.status })
        .from(invoices)
        .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, requireCompany(actor.companyId))))
        .limit(1),
    );

    if (!inv) throw new BadRequestException('Invoice not found');
    if (inv.status === 'paid') throw new BadRequestException('Invoice is already paid');

    const webUrl = this.config.get<string>('WEB_URL') ?? 'https://ddinvoice.com';
    const amount = parseFloat(inv.total).toFixed(2);
    const currency = inv.currency ?? 'AED';
    const cartId = `INV-${inv.number}-${Date.now()}`;

    const payload = {
      ivp_method: 'create',
      ivp_store: storeId,
      ivp_authkey: authKey,
      ivp_amount: amount,
      ivp_currency: currency,
      ivp_test: process.env.NODE_ENV !== 'production' ? '1' : '0',
      ivp_cart: cartId,
      ivp_desc: `Invoice ${inv.number}`,
      ivp_framed: '0',
      return_auth: `${webUrl}/portal/payment/success?cart=${cartId}`,
      return_decl: `${webUrl}/portal/payment/declined?cart=${cartId}`,
      return_can: `${webUrl}/portal/payment/cancelled?cart=${cartId}`,
    };

    try {
      const resp = await fetch('https://secure.telr.com/gateway/order.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json() as { order?: { url?: string; ref?: string }; error?: { message?: string } };

      if (data.error) throw new BadRequestException(`Telr error: ${data.error.message ?? 'Unknown error'}`);
      if (!data.order?.url) throw new BadRequestException('Telr did not return a payment URL');

      return { paymentUrl: data.order.url, cartId };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error('Telr createOrder failed', e instanceof Error ? e.message : String(e));
      throw new ServiceUnavailableException('Payment gateway unavailable');
    }
  }

  async handleCallback(body: Record<string, string>): Promise<{ ok: boolean }> {
    const { storeId, authKey } = this.getCredentials();

    if (body.ivp_store !== storeId || body.ivp_authkey !== authKey) {
      this.logger.warn('Telr callback: invalid credentials');
      return { ok: false };
    }

    const status = body.ivp_trantype;
    if (status !== 'A') {
      this.logger.log(`Telr callback: non-auth status ${status}`);
      return { ok: false };
    }

    // Extract invoice number from cart id (INV-<number>-<ts>)
    const cartId = body.ivp_cart ?? '';
    const match = cartId.match(/^INV-(.+?)-\d+$/);
    if (!match) return { ok: false };

    const invNumber = match[1];
    // Update invoice status to paid across all tenants (admin DB needed; for now log)
    this.logger.log(`Telr payment success for invoice number: ${invNumber}, ref: ${body.ivp_tranref}`);

    return { ok: true };
  }

  isConfigured(): boolean {
    return !!(this.config.get<string>('TELR_STORE_ID') && this.config.get<string>('TELR_AUTH_KEY'));
  }
}
