import type { ReactNode } from 'react';

export type Direction = 'up' | 'down' | 'flat';

export function directionOf(change: number | undefined): Direction {
  if (change === undefined || Math.abs(change) < 0.05) return 'flat';
  return change > 0 ? 'up' : 'down';
}

export function ChangeBadge({ change }: { change: number | undefined }) {
  const dir = directionOf(change);
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—';
  const text = change === undefined ? 'n/a' : `${Math.abs(change).toFixed(1)}%`;
  return <span className={`dash-badge ${dir}`}>{arrow} {text}</span>;
}

interface KpiCardProps {
  label: string;
  amount: string;
  change?: number;
  sub: string;
  info?: ReactNode;
}

export function KpiCard({ label, amount, change, sub, info }: KpiCardProps) {
  return (
    <div className="dash-card flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--dash-fg2)]">{label}</span>
        {info}
      </div>
      <div className="dash-kpi-amount">{amount}</div>
      <div className="flex items-center gap-2">
        <ChangeBadge change={change} />
        <span className="dash-sub">{sub}</span>
      </div>
    </div>
  );
}
