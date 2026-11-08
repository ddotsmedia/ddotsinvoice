export interface Customer {
  id: string;
  name: string;
  nameAr: string | null;
  trn: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: number;
  currency: string;
  isActive: boolean;
  balance: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  descriptionAr: string | null;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  discountAmount: string;
  lineSubtotal: string;
  vatType: 'standard' | 'zero_rated' | 'exempt';
  vatRate: string;
  vatAmount: string;
  lineTotal: string;
}

export interface InvoiceRow {
  id: string;
  type: 'quote' | 'invoice' | 'credit_note';
  status: string;
  number: string;
  date: string;
  dueDate: string | null;
  currency: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  paidAmount: string;
  balanceDue: string;
  customerId: string;
  notes: string | null;
  notesAr: string | null;
  termsAndConditions: string | null;
  creditNoteForId: string | null;
  convertedFromId: string | null;
  customer: { id: string; name: string; trn: string | null };
  lines: InvoiceLine[];
}

export interface Statement {
  customer: Customer;
  invoices: { number: string; date: string; dueDate: string | null; total: string; paidAmount: string; balanceDue: string; status: string }[];
  totalOutstanding: string;
  aging: Record<'current' | 'days30' | 'days60' | 'days90' | 'over90', string>;
}

export interface VatSummary {
  standardRated: { count: number; taxableAmount: string; vatAmount: string };
  zeroRated: { count: number; taxableAmount: string };
  exempt: { count: number; taxableAmount: string };
  totalVatCollected: string;
  vatPayableAccountBalance: string;
}
