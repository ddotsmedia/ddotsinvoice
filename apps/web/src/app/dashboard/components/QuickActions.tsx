import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  bg: string;
  color: string;
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="dash-card min-w-[220px]">
      <div className="dash-title">Quick Actions</div>
      <div className="dash-sub mb-3.5 mt-0.5">Perform frequent finance tasks</div>
      <div className="flex flex-col gap-0.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href} className="dash-qa-item">
              <span className="dash-qa-icon" style={{ background: a.bg, color: a.color }}>
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-[var(--accent)]">{a.label}</span>
                <span className="block text-[11px] text-[var(--dash-fg3)]">{a.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
