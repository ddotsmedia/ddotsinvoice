'use client';

import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface DataPoint {
  month: string;
  net: number;
  revenue: number;
  expenses: number;
}

interface ProfitTrendChartProps {
  data: DataPoint[];
  isLoading: boolean;
}

const PERIODS = ['1W', '1M', '3M', '6M', 'All'] as const;
type Period = typeof PERIODS[number];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

export function ProfitTrendChart({ data, isLoading }: ProfitTrendChartProps) {
  const [period, setPeriod] = useState<Period>('6M');

  const sliced = period === '1W' || period === '1M' ? data.slice(-1)
    : period === '3M' ? data.slice(-3)
    : data;

  const startLabel = sliced[0]?.month ?? '';
  const endLabel = sliced[sliced.length - 1]?.month ?? '';
  const dateRange = startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;

  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Net Profit Trend</h3>
          <p className="text-xs text-gray-400">{dateRange}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[200px]">
        {isLoading ? (
          <Skeleton className="h-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sliced} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                width={36}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(val: number) => [`AED ${val.toLocaleString('en-AE')}`, 'Net Profit']}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={{ fill: '#6366F1', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#6366F1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
