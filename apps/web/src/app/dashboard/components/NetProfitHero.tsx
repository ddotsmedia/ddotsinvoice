'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface NetProfitHeroProps {
  value: string;
  change?: number;
  period: string;
}

export function NetProfitHero({ value, change, period }: NetProfitHeroProps) {
  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)' }}
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-100">Net Profit</span>
          {hasChange && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              isPositive ? 'bg-emerald-400/20 text-emerald-200' : 'bg-red-400/20 text-red-200'
            }`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>

        <div className="mt-4 text-4xl font-extrabold tracking-tight" dir="ltr">{value}</div>
        <div className="mt-2 text-sm text-blue-200">{period}</div>

        <div className="mt-6 flex items-center gap-4 border-t border-white/20 pt-4 text-xs text-blue-100">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Revenue tracked
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Expenses deducted
          </div>
        </div>
      </div>
    </div>
  );
}
