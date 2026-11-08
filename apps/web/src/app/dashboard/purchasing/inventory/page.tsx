'use client';

import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { StockRow } from '@/lib/purchasing-types';

export default function InventoryPage() {
  const L = useLabel();
  const report = useQuery({ queryKey: ['stock-report'], queryFn: async () => (await api.get<StockRow[]>('/purchasing/inventory/stock-report')).data });
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{L('Stock Report', 'تقرير المخزون')}</h1>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Item', 'الصنف')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Qty', 'الكمية')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Avg cost', 'متوسط التكلفة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Value', 'القيمة')}</th>
            </tr>
          </thead>
          <tbody>
            {report.data?.map((r) => (
              <tr key={`${r.itemId}-${r.warehouseId}`} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-2 font-mono" dir="ltr">{r.code}</td>
                <td className="px-4 py-2">{r.nameEn}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.qty).toString()}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.avgCost).toFixed(2)}</td>
                <td className="px-4 py-2 text-end font-mono" dir="ltr">{money(r.totalValue).toFixed(2)}</td>
              </tr>
            ))}
            {report.data && !report.data.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{L('No stock', 'لا يوجد مخزون')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
