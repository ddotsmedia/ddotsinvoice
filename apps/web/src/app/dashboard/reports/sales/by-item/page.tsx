'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Row { nameEn: string; nameAr: string; qty: string; totalAmount: string; avgPrice: string }

export default function SalesByItemPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({ queryKey: ['sbi', from, to], queryFn: async () => (await api.get<Row[]>('/reports/sales/by-item', { params: { fromDate: from, toDate: to } })).data });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Sales by Item', 'المبيعات حسب الصنف')}</h1>
        <div className="flex gap-2">
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Item', 'الصنف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Avg price', 'متوسط السعر')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Total', 'الإجمالي')}</th>
            </tr>
          </thead>
          <tbody>
            {r.data?.map((x) => (
              <tr key={x.nameEn} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2">{L(x.nameEn, x.nameAr || x.nameEn)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.qty).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.avgPrice).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(x.totalAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
