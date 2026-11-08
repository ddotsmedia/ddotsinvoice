import * as M from '@ddotsinvoice/money';

interface Party { name: string; nameAr?: string | null; trn?: string | null; address?: string | null; addressAr?: string | null; email?: string | null; phone?: string | null; logoUrl?: string | null }
interface Doc { number: string; type: string; date: string; dueDate: string | null; currency: string; subtotal: string; vatAmount: string; total: string; paidAmount: string; balanceDue: string; notes: string | null; notesAr: string | null; termsAndConditions: string | null }
interface Line { description: string; descriptionAr: string | null; quantity: string; unitPrice: string; discountAmount: string; lineSubtotal: string; vatType: string; vatAmount: string; lineTotal: string }

export interface InvoiceHtmlInput {
  inv: Doc;
  company: Party & { id?: string } | undefined;
  customer: Party;
  lines: Line[];
}

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const f = (v: string): string => M.money(v).toFixed(2);

const TYPE_LABEL: Record<string, [string, string]> = {
  invoice: ['TAX INVOICE', 'فاتورة ضريبية'],
  credit_note: ['CREDIT NOTE', 'إشعار دائن'],
  quote: ['QUOTATION', 'عرض سعر'],
};

const VAT_LABEL: Record<string, string> = { standard: '5%', zero_rated: '0%', exempt: 'Exempt / معفى' };

export function renderInvoiceHtml({ inv, company, customer, lines }: InvoiceHtmlInput): string {
  const [typeEn, typeAr] = TYPE_LABEL[inv.type] ?? TYPE_LABEL.invoice;
  const c = company ?? { name: '' };
  const rows = lines
    .map(
      (l, i) => `<tr>
  <td>${i + 1}</td>
  <td><div>${esc(l.description)}</div>${l.descriptionAr ? `<div class="ar">${esc(l.descriptionAr)}</div>` : ''}</td>
  <td class="num">${esc(M.money(l.quantity).toString())}</td>
  <td class="num">${f(l.unitPrice)}</td>
  <td class="num">${f(l.discountAmount)}</td>
  <td class="num">${f(l.lineSubtotal)}</td>
  <td class="num">${VAT_LABEL[l.vatType] ?? ''}<br>${f(l.vatAmount)}</td>
  <td class="num">${f(l.lineTotal)}</td>
</tr>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 14mm; }
body { font-family: 'Noto Sans', 'Noto Sans Arabic', sans-serif; color: #0f172a; font-size: 11.5px; margin: 0; }
.row { display: flex; justify-content: space-between; gap: 16px; }
.col { flex: 1; }
.ar { direction: rtl; text-align: right; font-family: 'Noto Sans Arabic', 'Noto Sans', sans-serif; }
.en { direction: ltr; text-align: left; }
.muted { color: #64748b; font-size: 10.5px; }
.title { font-size: 18px; font-weight: 700; margin: 10px 0; }
.box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.logo { width: 60px; height: 60px; object-fit: contain; border: 1px dashed #cbd5e1; }
table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { border-bottom: 1px solid #e2e8f0; padding: 5px; vertical-align: top; }
th { background: #f8fafc; text-align: left; font-size: 10.5px; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.totals { width: 48%; margin-left: auto; margin-top: 10px; }
.totals td { border: none; padding: 3px 6px; }
.grand td { font-weight: 700; border-top: 2px solid #0f172a; }
footer { margin-top: 22px; text-align: center; color: #475569; }
</style></head>
<body>
<div class="row">
  <div class="col en">
    ${c.logoUrl ? `<img class="logo" src="${esc(c.logoUrl)}">` : '<div class="logo"></div>'}
    <div><b>${esc(c.name)}</b></div>
    <div class="muted">TRN: ${esc(c.trn)}</div>
    <div class="muted">${esc(c.address)}</div>
    <div class="muted">${esc(c.email)} ${esc(c.phone)}</div>
  </div>
  <div class="col ar">
    <div><b>${esc(c.nameAr ?? c.name)}</b></div>
    <div class="muted">الرقم الضريبي: ${esc(c.trn)}</div>
    <div class="muted">${esc(c.addressAr ?? c.address)}</div>
  </div>
</div>

<div class="row">
  <div class="col en"><div class="title">${typeEn}</div>
    <div>No. <b>${esc(inv.number)}</b></div>
    <div>Date: ${esc(inv.date)}</div>
    ${inv.dueDate ? `<div>Due: ${esc(inv.dueDate)}</div>` : ''}
  </div>
  <div class="col ar"><div class="title">${typeAr}</div>
    <div>رقم: <b>${esc(inv.number)}</b></div>
    <div>التاريخ: ${esc(inv.date)}</div>
    ${inv.dueDate ? `<div>الاستحقاق: ${esc(inv.dueDate)}</div>` : ''}
  </div>
</div>

<div class="row" style="margin-top:10px">
  <div class="col en box"><div class="muted">Bill to</div><b>${esc(customer.name)}</b>
    <div class="muted">TRN: ${esc(customer.trn)}</div><div class="muted">${esc(customer.address)}</div></div>
  <div class="col ar box"><div class="muted">فاتورة إلى</div><b>${esc(customer.nameAr ?? customer.name)}</b>
    <div class="muted">الرقم الضريبي: ${esc(customer.trn)}</div><div class="muted">${esc(customer.addressAr ?? customer.address)}</div></div>
</div>

<table>
  <thead><tr>
    <th>#</th><th>Description / الوصف</th><th class="num">Qty / الكمية</th><th class="num">Unit / السعر</th>
    <th class="num">Discount / الخصم</th><th class="num">Subtotal / المجموع</th><th class="num">VAT / الضريبة</th><th class="num">Total / الإجمالي</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<table class="totals">
  <tr><td class="en">Subtotal</td><td class="ar">المجموع الفرعي</td><td class="num">${f(inv.subtotal)}</td></tr>
  <tr><td class="en">VAT (5%)</td><td class="ar">ضريبة القيمة المضافة</td><td class="num">${f(inv.vatAmount)}</td></tr>
  <tr class="grand"><td class="en">Total</td><td class="ar">الإجمالي</td><td class="num">${f(inv.total)} ${esc(inv.currency)}</td></tr>
  <tr><td class="en">Paid</td><td class="ar">المدفوع</td><td class="num">${f(inv.paidAmount)}</td></tr>
  <tr class="grand"><td class="en">Balance Due</td><td class="ar">المبلغ المستحق</td><td class="num">${f(inv.balanceDue)}</td></tr>
</table>

${inv.notes || inv.notesAr ? `<div class="row" style="margin-top:14px">
  <div class="col en"><div class="muted">Notes</div>${esc(inv.notes)}</div>
  <div class="col ar"><div class="muted">ملاحظات</div>${esc(inv.notesAr)}</div></div>` : ''}
${inv.termsAndConditions ? `<div class="row" style="margin-top:10px">
  <div class="col en"><div class="muted">Terms &amp; Conditions</div>${esc(inv.termsAndConditions)}</div></div>` : ''}

<footer>
  <div>Thank you for your business</div>
  <div class="ar">شكراً لتعاملكم معنا</div>
</footer>
</body></html>`;
}
