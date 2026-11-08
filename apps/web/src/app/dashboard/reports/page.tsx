'use client';

import Link from 'next/link';
import { cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

const REPORTS = [
  { href: '/dashboard/reports/balance-sheet', en: 'Balance Sheet', ar: 'الميزانية العمومية' },
  { href: '/dashboard/reports/income-statement', en: 'Income Statement', ar: 'قائمة الدخل' },
  { href: '/dashboard/reports/trial-balance', en: 'Trial Balance', ar: 'ميزان المراجعة' },
  { href: '/dashboard/reports/cash-flow', en: 'Cash Flow', ar: 'التدفقات النقدية' },
  { href: '/dashboard/reports/aging/receivables', en: 'Receivables Aging', ar: 'أعمار الذمم المدينة' },
  { href: '/dashboard/reports/aging/payables', en: 'Payables Aging', ar: 'أعمار الذمم الدائنة' },
  { href: '/dashboard/reports/sales/by-customer', en: 'Sales by Customer', ar: 'المبيعات حسب العميل' },
  { href: '/dashboard/reports/sales/by-item', en: 'Sales by Item', ar: 'المبيعات حسب الصنف' },
  { href: '/dashboard/reports/payroll/summary', en: 'Payroll Summary', ar: 'ملخص الرواتب' },
];

export default function ReportsHub() {
  const L = useLabel();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('Reports', 'التقارير')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className={`${cardCls} p-5 hover:border-primary`}>
            {L(r.en, r.ar)}
          </Link>
        ))}
      </div>
    </div>
  );
}
