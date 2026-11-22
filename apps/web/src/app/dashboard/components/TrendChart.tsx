'use client';

import { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type Period = '1D' | '1W' | '1M' | '1Y' | 'All';

export interface TrendPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  series: Record<Period, TrendPoint[]>;
  initial?: Period;
}

const PERIODS: Period[] = ['1D', '1W', '1M', '1Y', 'All'];

const aed = (v: number) => `AED ${v.toLocaleString('en-AE')}`;

export function TrendChart({ series, initial = '1M' }: TrendChartProps) {
  const [period, setPeriod] = useState<Period>(initial);
  const data = series[period];

  return (
    <div className="dash-card flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="dash-title">Net Profit Trend</span>
        <div className="flex gap-1" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`dash-pill${p === period ? ' active' : ''}`}
              aria-pressed={p === period}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="dashProfitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dash-border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--dash-fg3)', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis
              tick={{ fill: 'var(--dash-fg3)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            />
            <Tooltip formatter={(v) => aed(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#dashProfitFill)" isAnimationActive={false} />
            <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
