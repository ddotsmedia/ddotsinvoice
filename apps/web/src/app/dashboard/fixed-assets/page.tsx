'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, Car, Computer, Package, Plus, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface FixedAsset {
  id: string; code: string; name: string; nameAr: string | null;
  category: string | null; acquisitionDate: string; acquisitionCost: string;
  residualValue: string; accumulatedDepreciation: string; usefulLifeMonths: number;
  depreciationMethod: string; status: string; disposalDate: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fully_depreciated: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  disposed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  idle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const CATEGORY_ICONS: Record<string, typeof Building2> = {
  building: Building2, vehicle: Car, equipment: Wrench, computer: Computer,
};

function CategoryIcon({ category }: { category: string | null }) {
  const Cat = category ? (CATEGORY_ICONS[category.toLowerCase()] ?? Package) : Package;
  return <Cat className="h-4 w-4 text-muted" />;
}

export default function FixedAssetsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => (await api.get<FixedAsset[]>('/fixed-assets')).data,
  });
  const summary = useQuery({
    queryKey: ['fixed-assets-summary'],
    queryFn: async () => (await api.get<{ status: string; count: number; totalCost: string; totalAccumulated: string }[]>('/fixed-assets/summary')).data,
  });

  const totals = summary.data?.reduce(
    (acc, r) => ({
      count: acc.count + r.count,
      cost: acc.cost + Number(r.totalCost ?? 0),
      accumulated: acc.accumulated + Number(r.totalAccumulated ?? 0),
    }),
    { count: 0, cost: 0, accumulated: 0 },
  );

  const fmt = (n: number) => n.toLocaleString('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Fixed Assets', 'الأصول الثابتة')}</h1>
        <Link href="/dashboard/fixed-assets/new" className={btnCls}>
          <Plus className="me-1 h-4 w-4" />
          {L('New Asset', 'أصل جديد')}
        </Link>
      </div>

      {/* KPI strip */}
      {totals && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: L('Total Assets', 'إجمالي الأصول'), value: totals.count },
            { label: L('Total Cost', 'إجمالي التكلفة'), value: fmt(totals.cost) },
            { label: L('Accumulated Dep.', 'الاستهلاك المتراكم'), value: fmt(totals.accumulated) },
            { label: L('Net Book Value', 'القيمة الدفترية'), value: fmt(totals.cost - totals.accumulated) },
          ].map((k) => (
            <div key={k.label} className={`${cardCls} p-4`}>
              <p className="text-xs text-muted">{k.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Asset', 'الأصل')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Category', 'الفئة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Cost', 'التكلفة')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Accum. Dep.', 'الاستهلاك')}</th>
              <th className="px-4 py-3 text-end font-medium">{L('Net Value', 'القيمة الصافية')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.data?.map((a) => {
              const cost = Number(a.acquisitionCost);
              const acc = Number(a.accumulatedDepreciation);
              return (
                <tr key={a.id} className="border-t border-border dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{a.code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={a.category} />
                      <span>{L(a.name, a.nameAr ?? a.name)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{a.category ?? '—'}</td>
                  <td className="px-4 py-3 text-end font-mono" dir="ltr">{fmt(cost)}</td>
                  <td className="px-4 py-3 text-end font-mono text-red-500 dark:text-red-400" dir="ltr">({fmt(acc)})</td>
                  <td className="px-4 py-3 text-end font-mono font-medium" dir="ltr">{fmt(cost - acc)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? ''}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/fixed-assets/${a.id}`} className="text-xs text-brand-500 hover:underline">
                      {L('View', 'عرض')}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {list.data && !list.data.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {L('No fixed assets yet. Add your first asset to start tracking depreciation.', 'لا توجد أصول ثابتة بعد.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
