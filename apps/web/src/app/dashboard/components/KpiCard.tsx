'use client';

import type { ComponentType } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  change?: number; // percent change, positive = up, negative = down
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

export function KpiCard({ label, value, change, icon: Icon, iconBg, iconColor }: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {hasChange && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 tabular-nums" dir="ltr">{value}</div>
        <div className="mt-1 text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        {hasChange && (
          <div className="mt-1 text-xs text-gray-400">vs last 30 days</div>
        )}
      </div>
    </div>
  );
}
