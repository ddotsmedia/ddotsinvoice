'use client';

import { useTranslations } from 'next-intl';
import { cardCls } from '@/components/ui';

const KPIS = ['kpi.totalInvoices', 'kpi.revenueMtd', 'kpi.outstanding', 'kpi.companies'];

export default function DashboardPage() {
  const t = useTranslations();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{t('nav.dashboard')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k} className={`${cardCls} p-5`}>
            <div className="text-sm text-slate-500">{t(k)}</div>
            <div className="mt-2 text-3xl font-bold">0</div>
          </div>
        ))}
      </div>
    </div>
  );
}
