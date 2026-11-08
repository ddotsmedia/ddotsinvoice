'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { month: number; totalGross: string; totalDeductions: string; totalNet: string; headcount: number }

export default function PayrollSummaryPage() {
  const L = useLabel();
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const r = useQuery({ queryKey: ['payroll-sum', year], queryFn: async () => (await api.get<Row[]>('/reports/payroll/summary', { params: { year } })).data });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Payroll Summary', 'ملخص الرواتب')}</h1>
        <input type="number" dir="ltr" className={`${inputCls} w-32`} value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Month', 'الشهر')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Headcount', 'عدد الموظفين')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Gross', 'الإجمالي')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Deductions', 'الخصومات')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Net', 'الصافي')}</th>
            </tr>
          </thead>
          <tbody>
            {r.data?.map((x) => (
              <tr key={x.month} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2" dir="ltr">{year}-{String(x.month).padStart(2, '0')}</td>
                <td className="px-4 py-2 text-end">{x.headcount}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.totalGross).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.totalDeductions).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.totalNet).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
