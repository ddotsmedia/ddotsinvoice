import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: string;
  status: string;
  dueDate: string;
}

const STATUS_STYLES: Record<string, string> = {
  posted: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  posted: 'Posted',
  partially_paid: 'Partial',
  overdue: 'Overdue',
  paid: 'Paid',
  draft: 'Draft',
};

const aedFmt = new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const aed = (v: string) => `AED ${aedFmt.format(v as never)}`;

export function RecentInvoices({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="dash-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="dash-title">Recent Invoices</span>
        <Link href="/dashboard/invoicing/invoices" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          View All →
        </Link>
      </div>

      {invoices.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--dash-fg3)]">No invoices yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--dash-border)]">
          {invoices.slice(0, 5).map((inv) => (
            <Link
              key={inv.id}
              href={`/dashboard/invoicing/invoices/${inv.id}`}
              className="flex items-center gap-3 py-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold text-[var(--dash-fg)]">{inv.invoiceNumber}</div>
                <div className="text-xs text-[var(--dash-fg3)] truncate">{inv.customerName}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold text-[var(--dash-fg)]">{aed(inv.total)}</div>
                <div className="text-[11px] text-[var(--dash-fg3)]">{inv.dueDate}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}>
                {STATUS_LABEL[inv.status] ?? inv.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
