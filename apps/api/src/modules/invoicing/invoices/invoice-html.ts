import * as M from '@ddotsinvoice/money';

interface Party { name: string; nameAr?: string | null; trn?: string | null; address?: string | null; addressAr?: string | null; email?: string | null; phone?: string | null; logoUrl?: string | null }
interface Doc { number: string; type: string; date: string; dueDate: string | null; currency: string; subtotal: string; vatAmount: string; total: string; paidAmount: string; balanceDue: string; paymentTerms?: number; notes: string | null; notesAr: string | null; termsAndConditions: string | null }
interface Line { description: string; descriptionAr: string | null; quantity: string; unitPrice: string; discountAmount: string; lineSubtotal: string; vatType: string; vatAmount: string; lineTotal: string }

export interface InvoiceHtmlInput {
  inv: Doc;
  company: Party & { id?: string } | undefined;
  customer: Party;
  lines: Line[];
}

const PRIMARY = '#0A1628';
const ACCENT = '#F59E0B';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const f = (v: string): string => M.money(v).toFixed(2);

const TYPE_LABEL: Record<string, [string, string]> = {
  invoice: ['TAX INVOICE', 'فاتورة ضريبية'],
  credit_note: ['CREDIT NOTE', 'إشعار دائن'],
  quote: ['QUOTATION', 'عرض سعر'],
};
const VAT_LABEL: Record<string, string> = { standard: '5%', zero_rated: '0%', exempt: 'Exempt / معفى' };

// DdotsInvoice mark (placeholder logo)
const LOGO = `<svg width="56" height="56" viewBox="0 0 56 56" aria-label="DdotsInvoice"><rect width="56" height="56" rx="12" fill="${PRIMARY}"/><path d="M14 38V18h9c7 0 11 4 11 10s-4 10-11 10h-9zm5-4h4c4.4 0 6.5-2.2 6.5-6s-2.1-6-6.5-6h-4z" fill="#fff"/><circle cx="43" cy="18" r="4" fill="${ACCENT}"/></svg>`;

export function renderInvoiceHtml({ inv, company, customer, lines }: InvoiceHtmlInput): string {
  const [typeEn, typeAr] = TYPE_LABEL[inv.type] ?? TYPE_LABEL.invoice;
  const c = company ?? { name: '' };
  const rows = lines
    .map(
      (l, i) => `<tr class="${i % 2 ? 'alt' : ''}">
  <td class="center">${i + 1}</td>
  <td><div>${esc(l.description)}</div>${l.descriptionAr ? `<div class="ar muted">${esc(l.descriptionAr)}</div>` : ''}</td>
  <td class="num">${esc(M.money(l.quantity).toString())}</td>
  <td class="num">${f(l.unitPrice)}</td>
  <td class="num">${f(l.discountAmount)}</td>
  <td class="num">${f(l.lineSubtotal)}</td>
  <td class="num">${VAT_LABEL[l.vatType] ?? ''}<br>${f(l.vatAmount)}</td>
  <td class="num strong">${f(l.lineTotal)}</td>
</tr>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.en { direction: ltr; text-align: left; }
.ar { direction: rtl; text-align: right; font-family: 'Noto Sans Arabic', 'Noto Sans', sans-serif; }
.muted { color: #64748b; font-size: 10px; }
.strong { font-weight: 700; }
.center { text-align: center; }
.header { background: ${PRIMARY}; color: #fff; padding: 14px 16px; border-radius: 8px; margin-bottom: 12px; }
.title { font-size: 18px; font-weight: 700; color: ${ACCENT}; margin: 6px 0; }
.box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.accent { border-inline-start: 4px solid ${ACCENT}; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 5px; vertical-align: top; }
th { background: ${PRIMARY}; color: #fff; font-size: 10px; text-align: start; }
tr.alt td { background: #F8FAFC; }
.num { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
.summary { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px; }
.totals td { border: none; padding: 3px 6px; }
.totals .grand td { font-weight: 700; border-top: 2px solid ${PRIMARY}; font-size: 13px; }
footer { margin-top: 22px; text-align: center; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style></head>
<body>
<div class="header grid2">
  <div class="en">
    <div style="display:flex;gap:10px;align-items:center">${LOGO}<div><b>${esc(c.name)}</b></div></div>
    <div class="muted">TRN: ${esc(c.trn)}</div>
    <div class="muted">${esc(c.address)}</div>
    <div class="muted">${esc(c.email)} ${esc(c.phone)}</div>
  </div>
  <div class="ar">
    <div><b>${esc(c.nameAr ?? c.name)}</b></div>
    <div class="muted">الرقم الضريبي: ${esc(c.trn)}</div>
    <div class="muted">${esc(c.addressAr ?? c.address)}</div>
  </div>
</div>

<div class="grid2">
  <div class="en"><div class="title">${typeEn}</div>
    <div>No. <b>${esc(inv.number)}</b></div>
    <div>Date: ${esc(inv.date)}</div>
    ${inv.dueDate ? `<div>Due: ${esc(inv.dueDate)}</div>` : ''}
  </div>
  <div class="ar"><div class="title">${typeAr}</div>
    <div>رقم: <b>${esc(inv.number)}</b></div>
    <div>التاريخ: ${esc(inv.date)}</div>
    ${inv.dueDate ? `<div>الاستحقاق: ${esc(inv.dueDate)}</div>` : ''}
  </div>
</div>

<div class="grid2" style="margin-top:10px">
  <div class="en box accent"><div class="muted">Bill to</div><b>${esc(customer.name)}</b>
    <div class="muted">TRN: ${esc(customer.trn)}</div><div class="muted">${esc(customer.address)}</div></div>
  <div class="ar box accent"><div class="muted">فاتورة إلى</div><b>${esc(customer.nameAr ?? customer.name)}</b>
    <div class="muted">الرقم الضريبي: ${esc(customer.trn)}</div><div class="muted">${esc(customer.addressAr ?? customer.address)}</div></div>
</div>

<table>
  <thead><tr>
    <th class="center">#</th><th>Description / الوصف</th><th class="num">Qty / الكمية</th><th class="num">Unit / السعر</th>
    <th class="num">Discount / الخصم</th><th class="num">Subtotal / المجموع</th><th class="num">VAT / الضريبة</th><th class="num">Total / الإجمالي</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="summary">
  <div class="en box">
    <div class="muted">Payment terms / شروط الدفع</div>
    <div>${inv.paymentTerms !== undefined ? `Net ${inv.paymentTerms}` : '—'}${inv.dueDate ? ` · Due ${esc(inv.dueDate)}` : ''}</div>
    ${inv.termsAndConditions ? `<div class="muted" style="margin-top:6px">${esc(inv.termsAndConditions)}</div>` : ''}
  </div>
  <table class="totals">
    <tr><td class="en">Subtotal</td><td class="ar">المجموع الفرعي</td><td class="num">${f(inv.subtotal)}</td></tr>
    <tr><td class="en">VAT (5%)</td><td class="ar">ضريبة القيمة المضافة</td><td class="num">${f(inv.vatAmount)}</td></tr>
    <tr class="grand"><td class="en">Total</td><td class="ar">الإجمالي</td><td class="num">${f(inv.total)} ${esc(inv.currency)}</td></tr>
    <tr><td class="en">Paid</td><td class="ar">المدفوع</td><td class="num">${f(inv.paidAmount)}</td></tr>
    <tr class="grand"><td class="en">Balance Due</td><td class="ar">المبلغ المستحق</td><td class="num">${f(inv.balanceDue)}</td></tr>
  </table>
</div>

${inv.notes || inv.notesAr ? `<div class="grid2" style="margin-top:14px">
  <div class="en"><div class="muted">Notes</div>${esc(inv.notes)}</div>
  <div class="ar"><div class="muted">ملاحظات</div>${esc(inv.notesAr)}</div></div>` : ''}

<footer>
  <div>Thank you for your business</div>
  <div class="ar">شكراً لتعاملكم معنا</div>
</footer>
</body></html>`;
}
