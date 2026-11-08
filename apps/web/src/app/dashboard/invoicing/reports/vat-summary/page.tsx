'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { VatSummary } from '@/lib/invoicing-types';

export default function VatSummaryPage() {
  const L = useLabel();
  const year = new Date().getFullYear();
  const [dateFrom, setFrom] = useState(`${year}-01-01`);
  const [dateTo, setTo] = useState(`${year}-12-31`);

  const s = useQuery({
    queryKey: ['vat-summary', dateFrom, dateTo],
    queryFn: async () => (await api.get<VatSummary>('/invoicing/reports/vat-summary', { params: { dateFrom, dateTo } })).data,
  });

  const rows: { label: string; count?: number; taxable?: string; vat?: string }[] = s.data
    ? [
        { label: L('Standard-rated (5%)', 'مواد خاضعة للضريبة (5%)'), count: s.data.standardRated.count, taxable: s.data.standardRated.taxableAmount, vat: s.data.standardRated.vatAmount },
        { label: L('Zero-rated', 'خاضعة بنسبة صفر'), count: s.data.zeroRated.count, taxable: s.data.zeroRated.taxableAmount },
        { label: L('Exempt', 'معفاة'), count: s.data.exempt.count, taxable: s.data.exempt.taxableAmount },
      ]
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('VAT Summary', 'ملخص ضريبة القيمة المضافة')}</h1>
      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <input type="date" dir="ltr" className={inputCls} value={dateFrom} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" dir="ltr" className={inputCls} value={dateTo} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Category', 'الفئة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Documents', 'المستندات')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Taxable amount', 'المبلغ الخاضع')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('VAT', 'الضريبة')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-end">{r.count}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.taxable ?? '0').toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{r.vat ? money(r.vat).toFixed(2) : '—'}</td>
              </tr>
            ))}
            {s.data && (
              <>
                <tr className="border-t-2 border-border font-semibold dark:border-slate-700">
                  <td className="px-4 py-2" colSpan={3}>{L('Total VAT collected', 'إجمالي الضريبة المحصلة')}</td>
                  <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(s.data.totalVatCollected).toFixed(2)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="px-4 py-2" colSpan={3}>{L('VAT Payable account balance (2200)', 'رصيد ضريبة مستحقة (2200)')}</td>
                  <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(s.data.vatPayableAccountBalance).toFixed(2)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {s.isError && <p className="p-3 text-sm text-red-600">{L('Could not load report', 'تعذر تحميل التقرير')}</p>}
      </div>
    </div>
  );
}
