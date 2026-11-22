interface Account {
  label: string;
  value: string;
}

interface CashRunwayCardProps {
  weeks: number;
  description: string;
  accounts: Account[];
}

export function CashRunwayCard({ weeks, description, accounts }: CashRunwayCardProps) {
  return (
    <div className="dash-card flex flex-col gap-3">
      <div className="dash-title">Cash Runway</div>
      <div className="dash-runway-main">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Runway Period</div>
        <div className="dash-runway-weeks">{weeks} weeks</div>
        <div className="text-xs text-white/75">{description}</div>
      </div>
      {accounts.map((a) => (
        <div key={a.label} className="dash-runway-sub">
          <div className="text-[11px] font-medium text-[var(--dash-fg3)]">{a.label}</div>
          <div className="dash-runway-val">{a.value}</div>
        </div>
      ))}
    </div>
  );
}
