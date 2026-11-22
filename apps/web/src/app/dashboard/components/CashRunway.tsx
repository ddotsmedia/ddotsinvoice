'use client';

import { Landmark, Wallet2 } from 'lucide-react';

interface CashRunwayProps {
  runwayWeeks: number;
  corporateBalance: string;
  cashOnHand: string;
}

function healthLabel(weeks: number): { label: string; color: string; bg: string } {
  if (weeks >= 12) return { label: 'Healthy', color: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (weeks >= 6) return { label: 'Moderate', color: 'text-amber-700', bg: 'bg-amber-50' };
  return { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50' };
}

export function CashRunway({ runwayWeeks, corporateBalance, cashOnHand }: CashRunwayProps) {
  const health = healthLabel(runwayWeeks);
  const displayWeeks = isFinite(runwayWeeks) && runwayWeeks < 1000 ? runwayWeeks.toFixed(0) : '∞';

  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cash Runway</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${health.color} ${health.bg}`}>
          {health.label}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-extrabold text-gray-900">{displayWeeks}</span>
        <span className="mb-2 text-lg font-medium text-gray-500">weeks</span>
      </div>

      <p className="mt-1 text-xs text-gray-400">At current burn rate</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Landmark className="h-3.5 w-3.5" />
            Corporate Account
          </div>
          <div className="mt-1.5 text-sm font-bold text-gray-900 tabular-nums" dir="ltr">{corporateBalance}</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Wallet2 className="h-3.5 w-3.5" />
            Cash on Hand
          </div>
          <div className="mt-1.5 text-sm font-bold text-gray-900 tabular-nums" dir="ltr">{cashOnHand}</div>
        </div>
      </div>
    </div>
  );
}
