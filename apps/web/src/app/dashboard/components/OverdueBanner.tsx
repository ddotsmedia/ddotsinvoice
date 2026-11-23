import Link from 'next/link';

interface OverdueBannerProps {
  count: number;
  totalAmount: string;
}

const aedFmt = new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const aed = (v: string) => `AED ${aedFmt.format(v as never)}`;

export function OverdueBanner({ count, totalAmount }: OverdueBannerProps) {
  if (!count || count === 0) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border-l-4 border-red-500 px-4 py-3"
      style={{ background: 'linear-gradient(to right, #FEF2F2, #FEE2E2)' }}
    >
      <span className="shrink-0 animate-pulse text-xl">⚠️</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-red-800">
          {count} invoice{count === 1 ? '' : 's'} overdue — {aed(totalAmount)} outstanding
        </span>
      </div>
      <Link
        href="/dashboard/invoicing/invoices?status=overdue"
        className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
      >
        Review Overdue →
      </Link>
    </div>
  );
}
