import {
  ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, type SQL } from 'drizzle-orm';
import {
  accounts, companies, customers, Db, invoice_lines, invoices, Tx, withTenant,
} from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../../../infra/drizzle.module';
import { requireCompany, requireTenant } from '../../../common/tenant';
import { LineIn, nextNumber, openFyFor } from '../../accounting/accounting.util';

// Sequence key stays 'INV'; the displayed prefix comes from company settings.invoicePrefix (admin-configurable)
async function displayNumber(tx: Tx, companyId: string, seqPrefix: string, number: string): Promise<string> {
  if (seqPrefix !== 'INV') return number;
  const [co] = await tx.select({ settings: companies.settings }).from(companies).where(eq(companies.id, companyId)).limit(1);
  const custom = (co?.settings as { invoicePrefix?: string } | null)?.invoicePrefix;
  return custom ? number.replace(/^INV-/, `${custom}-`) : number;
}
import { postJournal, reverseJournal } from '../../accounting/journal-posting';
import { calcLine, calcTotals, CalcLine, LineInput } from '../invoice-calc';
import { PdfService } from './pdf.service';
import { renderInvoiceHtml } from './invoice-html';
import { BulkActionDto, BulkDeleteDto, CreateInvoiceDto, CreditNoteDto, InvoiceQueryDto, SendEmailDto, UpdateInvoiceDto } from './invoices.dto';

type Inv = typeof invoices.$inferSelect;
type LineRow = typeof invoice_lines.$inferSelect;
type Cust = typeof customers.$inferSelect;

const OPEN = ['posted', 'paid', 'partially_paid', 'overdue'] as const;
const EDITABLE = ['draft', 'sent'] as const;
const today = (): string => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const r6 = (x: M.Money): M.Money => M.money(M.toDb(x));

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly pdfService: PdfService,
  ) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  private async find(tx: Tx, companyId: string, id: string): Promise<Inv> {
    const [row] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .limit(1);
    if (!row) throw new NotFoundException('Document not found');
    return row;
  }

  private async customerOf(tx: Tx, companyId: string, id: string): Promise<Cust> {
    const [c] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId), isNull(customers.deletedAt)))
      .limit(1);
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }

  private async lines(tx: Tx, invoiceId: string): Promise<LineRow[]> {
    return tx.select().from(invoice_lines).where(eq(invoice_lines.invoiceId, invoiceId)).orderBy(asc(invoice_lines.sortOrder));
  }

  private async accountByCode(tx: Tx, companyId: string, code: string): Promise<string> {
    const [a] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.companyId, companyId), eq(accounts.code, code), eq(accounts.isActive, true)))
      .limit(1);
    if (!a) throw new UnprocessableEntityException(`Account ${code} is missing`);
    return a.id;
  }

  // Default postable revenue account when a line has none
  private async defaultRevenue(tx: Tx, companyId: string): Promise<string> {
    const [a] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.companyId, companyId),
          eq(accounts.type, 'revenue'),
          eq(accounts.isHeader, false),
          eq(accounts.isActive, true),
        ),
      )
      .orderBy(asc(accounts.code))
      .limit(1);
    if (!a) throw new UnprocessableEntityException('No postable revenue account configured');
    return a.id;
  }

  private prepare(inputs: LineInput[]): CalcLine[] {
    if (!inputs.length) throw new UnprocessableEntityException('At least one line is required');
    try {
      return inputs.map(calcLine);
    } catch (e) {
      throw new UnprocessableEntityException((e as Error).message);
    }
  }

  private async insertLines(
    tx: Tx,
    tenantId: string,
    companyId: string,
    invoiceId: string,
    calc: CalcLine[],
  ): Promise<LineRow[]> {
    return tx
      .insert(invoice_lines)
      .values(
        calc.map((l, i) => ({
          tenantId,
          companyId,
          invoiceId,
          sortOrder: i,
          description: l.description,
          descriptionAr: l.descriptionAr ?? null,
          quantity: M.toDb(M.money(l.quantity)),
          unitPrice: M.toDb(M.money(l.unitPrice)),
          discountPct: l.discountPct,
          discountAmount: l.discountAmount,
          lineSubtotal: l.lineSubtotal,
          vatType: l.vatType,
          vatRate: l.vatRate,
          vatAmount: l.vatAmount,
          lineTotal: l.lineTotal,
          revenueAccountId: l.revenueAccountId ?? null,
        })),
      )
      .returning();
  }

  // Sales journal lines (base currency). credit=false: invoice; credit=true: credit note (sides flipped)
  private async salesLines(
    tx: Tx,
    companyId: string,
    customer: Cust,
    rows: LineRow[],
    rate: M.Money,
    credit: boolean,
  ): Promise<LineIn[]> {
    const ar = customer.accountId ?? (await this.accountByCode(tx, companyId, '1200'));
    const vatAcct = await this.accountByCode(tx, companyId, '2200');
    const out: LineIn[] = [];
    let arSum = M.money(0);
    let vatSum = M.money(0);
    for (const l of rows) {
      const rev = r6(M.mul(M.money(l.lineSubtotal), rate));
      if (!rev.isZero()) {
        const acct = l.revenueAccountId ?? (await this.defaultRevenue(tx, companyId));
        const v = M.toDb(rev);
        out.push({ accountId: acct, debit: credit ? v : '0', credit: credit ? '0' : v, description: l.description });
        arSum = M.add(arSum, rev);
      }
      vatSum = M.add(vatSum, r6(M.mul(M.money(l.vatAmount), rate)));
    }
    arSum = M.add(arSum, vatSum);
    if (!vatSum.isZero()) {
      const v = M.toDb(vatSum);
      out.push({ accountId: vatAcct, debit: credit ? v : '0', credit: credit ? '0' : v, description: 'VAT' });
    }
    const a = M.toDb(arSum);
    out.push({ accountId: ar, debit: credit ? '0' : a, credit: credit ? a : '0', description: 'Receivable' });
    return out;
  }

  private load(tx: Tx, companyId: string, id: string) {
    return this.find(tx, companyId, id).then(async (inv) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
      return { ...inv, lines: await this.lines(tx, id), customer: { id: customer?.id, name: customer?.name, trn: customer?.trn } };
    });
  }

  list(actor: AccessTokenPayload, q: InvoiceQueryDto) {
    const { tenantId, companyId } = this.scope(actor);
    const conds: SQL[] = [eq(invoices.companyId, companyId)];
    if (q.type) conds.push(eq(invoices.type, q.type));
    if (q.status) conds.push(eq(invoices.status, q.status as Inv['status']));
    if (q.customerId) conds.push(eq(invoices.customerId, q.customerId));
    if (q.dateFrom) conds.push(gte(invoices.date, q.dateFrom));
    if (q.dateTo) conds.push(lte(invoices.date, q.dateTo));
    const where = and(...conds);
    return withTenant(this.db, tenantId, async (tx) => {
      const items = await tx
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.date), desc(invoices.number))
        .limit(q.limit)
        .offset((q.page - 1) * q.limit);
      const [{ total }] = await tx.select({ total: count() }).from(invoices).where(where);
      return { items, total, page: q.page, limit: q.limit };
    });
  }

  getById(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.load(tx, companyId, id));
  }

  create(actor: AccessTokenPayload, dto: CreateInvoiceDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const customer = await this.customerOf(tx, companyId, dto.customerId);
      const calc = this.prepare(dto.lines);
      const t = calcTotals(calc);
      const terms = dto.paymentTerms ?? customer.paymentTerms;
      const fy = await openFyFor(tx, companyId, dto.date);
      const prefix = dto.type === 'quote' ? 'QT' : 'INV';
      const number = await displayNumber(tx, companyId, prefix, await nextNumber(tx, companyId, prefix, dto.date.slice(0, 4)));
      const [inv] = await tx
        .insert(invoices)
        .values({
          tenantId,
          companyId,
          branchId: dto.branchId,
          customerId: customer.id,
          type: dto.type,
          status: 'draft',
          number,
          date: dto.date,
          dueDate: addDays(dto.date, terms),
          paymentTerms: terms,
          currency: dto.currency ?? customer.currency,
          exchangeRate: dto.exchangeRate ?? '1',
          subtotal: t.subtotal,
          vatAmount: t.vatAmount,
          total: t.total,
          balanceDue: t.total,
          notes: dto.notes,
          notesAr: dto.notesAr,
          termsAndConditions: dto.termsAndConditions,
          fiscalYearId: fy.id,
          createdBy: actor.sub,
        })
        .returning();
      await this.insertLines(tx, tenantId, companyId, inv.id, calc);
      return this.load(tx, companyId, inv.id);
    });
  }

  update(actor: AccessTokenPayload, id: string, dto: UpdateInvoiceDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      if (!(EDITABLE as readonly string[]).includes(inv.status)) {
        throw new UnprocessableEntityException('Only draft or sent documents can be edited');
      }
      const customer = await this.customerOf(tx, companyId, dto.customerId ?? inv.customerId);
      const date = dto.date ?? inv.date;
      const terms = dto.paymentTerms ?? inv.paymentTerms;
      const fy = await openFyFor(tx, companyId, date);
      const patch: Partial<typeof invoices.$inferInsert> = {
        customerId: customer.id,
        date,
        dueDate: addDays(date, terms),
        paymentTerms: terms,
        fiscalYearId: fy.id,
        branchId: dto.branchId,
        currency: dto.currency,
        exchangeRate: dto.exchangeRate,
        notes: dto.notes,
        notesAr: dto.notesAr,
        termsAndConditions: dto.termsAndConditions,
        updatedAt: new Date(),
      };
      if (dto.lines) {
        const calc = this.prepare(dto.lines);
        const t = calcTotals(calc);
        Object.assign(patch, { subtotal: t.subtotal, vatAmount: t.vatAmount, total: t.total, balanceDue: t.total });
        await tx.delete(invoice_lines).where(eq(invoice_lines.invoiceId, id));
        await this.insertLines(tx, tenantId, companyId, id, calc);
      }
      await tx.update(invoices).set(patch).where(eq(invoices.id, id));
      return this.load(tx, companyId, id);
    });
  }

  post(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      if (inv.type !== 'invoice') throw new UnprocessableEntityException('Only invoices can be posted');
      if (!(EDITABLE as readonly string[]).includes(inv.status)) {
        throw new UnprocessableEntityException('Only draft or sent invoices can be posted');
      }
      const customer = await this.customerOf(tx, companyId, inv.customerId);
      const rows = await this.lines(tx, id);
      if (rows.some((l) => l.vatType === 'standard')) {
        if (!customer.trn) {
          throw new UnprocessableEntityException('Customer TRN is required for standard-rated VAT invoices');
        }
        const [co] = await tx.select({ trn: companies.trn }).from(companies).where(eq(companies.id, companyId)).limit(1);
        if (!co?.trn) {
          throw new UnprocessableEntityException(
            'Company TRN is required for VAT-registered invoices. Please add your TRN in company settings before creating tax invoices.',
          );
        }
      }
      const jl = await this.salesLines(tx, companyId, customer, rows, M.money(inv.exchangeRate), false);
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: inv.branchId,
        date: inv.date,
        description: `Invoice ${inv.number}`,
        userId: actor.sub,
        lines: jl,
      });
      await tx
        .update(invoices)
        .set({ status: 'posted', journalEntryId: jeId, postedAt: new Date(), postedBy: actor.sub, updatedAt: new Date() })
        .where(eq(invoices.id, id));
      return this.load(tx, companyId, id);
    });
  }

  void(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      if (inv.type !== 'invoice' || inv.status !== 'posted' || !inv.journalEntryId) {
        throw new UnprocessableEntityException('Only posted invoices can be voided');
      }
      if (M.money(inv.paidAmount).greaterThan(0)) throw new UnprocessableEntityException('Invoice has payments');
      const [cn] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.creditNoteForId, id), eq(invoices.status, 'posted')))
        .limit(1);
      if (cn) throw new UnprocessableEntityException('Invoice has credit notes');
      await reverseJournal(tx, inv.journalEntryId, tenantId, companyId, actor.sub);
      await tx
        .update(invoices)
        .set({ status: 'void', balanceDue: '0', updatedAt: new Date() })
        .where(eq(invoices.id, id));
      return this.load(tx, companyId, id);
    });
  }

  // Quote -> new draft invoice with all lines; quote marked converted
  convert(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const q = await this.find(tx, companyId, id);
      if (q.type !== 'quote') throw new UnprocessableEntityException('Only quotes can be converted');
      if (!(EDITABLE as readonly string[]).includes(q.status)) {
        throw new UnprocessableEntityException('Quote must be draft or sent to convert');
      }
      const rows = await this.lines(tx, id);
      const date = today();
      const fy = await openFyFor(tx, companyId, date);
      const number = await displayNumber(tx, companyId, 'INV', await nextNumber(tx, companyId, 'INV', date.slice(0, 4)));
      const [inv] = await tx
        .insert(invoices)
        .values({
          tenantId,
          companyId,
          branchId: q.branchId,
          customerId: q.customerId,
          type: 'invoice',
          status: 'draft',
          number,
          date,
          dueDate: addDays(date, q.paymentTerms),
          paymentTerms: q.paymentTerms,
          currency: q.currency,
          exchangeRate: q.exchangeRate,
          subtotal: q.subtotal,
          vatAmount: q.vatAmount,
          total: q.total,
          balanceDue: q.total,
          notes: q.notes,
          notesAr: q.notesAr,
          termsAndConditions: q.termsAndConditions,
          convertedFromId: q.id,
          fiscalYearId: fy.id,
          createdBy: actor.sub,
        })
        .returning();
      await tx.insert(invoice_lines).values(
        rows.map((l) => ({
          tenantId,
          companyId,
          invoiceId: inv.id,
          sortOrder: l.sortOrder,
          description: l.description,
          descriptionAr: l.descriptionAr,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          discountAmount: l.discountAmount,
          lineSubtotal: l.lineSubtotal,
          vatType: l.vatType,
          vatRate: l.vatRate,
          vatAmount: l.vatAmount,
          lineTotal: l.lineTotal,
          revenueAccountId: l.revenueAccountId,
        })),
      );
      await tx
        .update(invoices)
        .set({ status: 'converted', updatedAt: new Date() })
        .where(eq(invoices.id, id));
      return this.load(tx, companyId, inv.id);
    });
  }

  // Credit note against a posted invoice; posts automatically
  createCreditNote(actor: AccessTokenPayload, invoiceId: string, dto: CreditNoteDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const orig = await this.find(tx, companyId, invoiceId);
      if (orig.type !== 'invoice' || !(OPEN as readonly string[]).includes(orig.status)) {
        throw new UnprocessableEntityException('Credit notes require a posted invoice');
      }
      const origRows = await this.lines(tx, invoiceId);
      const calc = this.prepare(
        dto.lines ??
          origRows.map((l) => ({
            description: l.description,
            descriptionAr: l.descriptionAr,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            vatType: l.vatType,
            revenueAccountId: l.revenueAccountId,
          })),
      );
      const t = calcTotals(calc);
      const prior = await tx
        .select({ total: invoices.total })
        .from(invoices)
        .where(and(eq(invoices.creditNoteForId, invoiceId), eq(invoices.status, 'posted')));
      const priorSum = prior.reduce((a, r) => M.add(a, M.money(r.total)), M.money(0));
      if (M.money(t.total).plus(priorSum).greaterThan(M.money(orig.total))) {
        throw new UnprocessableEntityException('Credit notes exceed the invoice total');
      }

      const date = dto.date ?? today();
      const fy = await openFyFor(tx, companyId, date);
      const number = await nextNumber(tx, companyId, 'CN', date.slice(0, 4));
      const [cn] = await tx
        .insert(invoices)
        .values({
          tenantId,
          companyId,
          branchId: orig.branchId,
          customerId: orig.customerId,
          type: 'credit_note',
          status: 'draft',
          number,
          date,
          paymentTerms: orig.paymentTerms,
          currency: orig.currency,
          exchangeRate: orig.exchangeRate,
          subtotal: t.subtotal,
          vatAmount: t.vatAmount,
          total: t.total,
          balanceDue: '0',
          creditNoteForId: orig.id,
          fiscalYearId: fy.id,
          createdBy: actor.sub,
        })
        .returning();
      const rows = await this.insertLines(tx, tenantId, companyId, cn.id, calc);

      const customer = await this.customerOf(tx, companyId, orig.customerId);
      const jl = await this.salesLines(tx, companyId, customer, rows, M.money(orig.exchangeRate), true);
      const jeId = await postJournal(tx, {
        tenantId,
        companyId,
        branchId: orig.branchId,
        date,
        description: `Credit note ${number} for ${orig.number}`,
        userId: actor.sub,
        lines: jl,
      });
      await tx
        .update(invoices)
        .set({ status: 'posted', journalEntryId: jeId, postedAt: new Date(), postedBy: actor.sub, updatedAt: new Date() })
        .where(eq(invoices.id, cn.id));

      const remaining = M.sub(M.money(orig.balanceDue), M.money(t.total));
      await tx
        .update(invoices)
        .set({ balanceDue: M.toDb(remaining.lessThan(0) ? M.money(0) : remaining), updatedAt: new Date() })
        .where(eq(invoices.id, orig.id));
      return this.load(tx, companyId, cn.id);
    });
  }

  async sendEmail(actor: AccessTokenPayload, id: string, dto: SendEmailDto): Promise<{ sent: true; to: string }> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;
    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      throw new ServiceUnavailableException('Email not configured');
    }
    const { tenantId, companyId } = this.scope(actor);
    const doc = await withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      const customer = await this.customerOf(tx, companyId, inv.customerId);
      const [company] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      return { inv, customer, company, lines: await this.lines(tx, id) };
    });
    const to = dto.to ?? doc.customer.email ?? '';
    if (!to) throw new UnprocessableEntityException('No recipient email address');
    const html = renderInvoiceHtml({ ...doc });
    const pdfBuffer = await this.pdfService.render(html);
    const transport = nodemailer.createTransport({
      host: smtpHost, port: smtpPort, secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transport.sendMail({
      from: smtpFrom,
      to,
      subject: `Invoice ${doc.inv.number} — AED ${parseFloat(doc.inv.total).toFixed(2)}`,
      text: `Dear ${doc.customer.name},\n\nPlease find attached your invoice #${doc.inv.number} for AED ${parseFloat(doc.inv.total).toFixed(2)}.\nDue date: ${doc.inv.dueDate ?? 'N/A'}.\n\nThank you for your business.`,
      attachments: [{ filename: `${doc.inv.number}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
    });
    return { sent: true, to };
  }

  bulkAction(actor: AccessTokenPayload, dto: BulkActionDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      await tx
        .update(invoices)
        .set({ status: 'sent', updatedAt: new Date() })
        .where(and(eq(invoices.companyId, companyId), inArray(invoices.id, dto.ids)));
      return { updated: dto.ids.length };
    });
  }

  bulkDelete(actor: AccessTokenPayload, dto: BulkDeleteDto) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const rows = await tx
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(and(eq(invoices.companyId, companyId), inArray(invoices.id, dto.ids)));
      const draftIds = rows.filter((r) => r.status === 'draft' || r.status === 'sent').map((r) => r.id);
      if (!draftIds.length) return { deleted: 0 };
      await tx.delete(invoice_lines).where(inArray(invoice_lines.invoiceId, draftIds));
      await tx.delete(invoices).where(inArray(invoices.id, draftIds));
      return { deleted: draftIds.length };
    });
  }

  // Draft/sent documents only
  remove(actor: AccessTokenPayload, id: string) {
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      if (!(EDITABLE as readonly string[]).includes(inv.status)) {
        throw new ConflictException('Only draft documents can be deleted');
      }
      await tx.delete(invoice_lines).where(eq(invoice_lines.invoiceId, id));
      await tx.delete(invoices).where(eq(invoices.id, id));
      return { id, deleted: true };
    });
  }

  async pdf(actor: AccessTokenPayload, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const { tenantId, companyId } = this.scope(actor);
    const doc = await withTenant(this.db, tenantId, async (tx) => {
      const inv = await this.find(tx, companyId, id);
      const customer = await this.customerOf(tx, companyId, inv.customerId);
      const [company] = await tx.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      return { inv, customer, company, lines: await this.lines(tx, id) };
    });
    const html = renderInvoiceHtml({ ...doc });
    return { buffer: await this.pdfService.render(html), filename: `${doc.inv.number}.pdf` };
  }
}
