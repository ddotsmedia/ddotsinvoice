'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, inputCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Cf {
  operating: { netProfit: string; changeReceivables: string; changeInventory: string; changePayables: string; changeGrni: string; total: string };
  investing: { total: string };
  financing: { total: string };
  netCashFlow: string;
}

export default function CashFlowPage() {
  const L = useLabel();
  const y = new Date().getUTCFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const r = useQuery({ queryKey: ['cf', from, to], queryFn: async () => (await api.get<Cf>('/reports/cash-flow', { params: { fromDate: from, toDate: to } })).data });
  const d = r.data;
  const line = (label: string, v: string) => (
    <div className="flex justify-between py-1 text-sm"><span>{label}</span><span className="font-mono" dir="ltr">{money(v).toFixed(2)}</span></div>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{L('Cash Flow', 'التدفقات النقدية')}</h1>
        <div className="flex gap-2">
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" dir="ltr" className={`${inputCls} w-44`} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {d && (
        <div className={`${cardCls} max-w-xl space-y-4 p-6`}>
          <h2 className="font-semibold">{L('Operating activities', 'الأنشطة التشغيلية')}</h2>
          {line(L('Net profit', 'صافي الربح'), d.operating.netProfit)}
          {line(L('Change in receivables', 'التغير في الذمم المدينة'), d.operating.changeReceivables)}
          {line(L('Change in inventory', 'التغير في المخزون'), d.operating.changeInventory)}
          {line(L('Change in payables', 'التغير في الذمم الدائنة'), d.operating.changePayables)}
          {line(L('Change in GRNI', 'التغير في البضائع المستلمة غير المفوترة'), d.operating.changeGrni)}
          {line(L('Investing activities', 'الأنشطة الاستثمارية'), d.investing.total)}
          {line(L('Financing activities', 'الأنشطة التمويلية'), d.financing.total)}
          <div className="flex justify-between border-t-2 border-border pt-2 font-bold" dir="ltr"><span>{L('Net cash flow', 'صافي التدفق النقدي')}</span><span className="font-mono">{money(d.netCashFlow).toFixed(2)}</span></div>
        </div>
      )}
    </div>
  );
}
