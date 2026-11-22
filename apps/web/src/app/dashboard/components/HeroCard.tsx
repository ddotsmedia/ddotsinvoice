interface HeroCardProps {
  eyebrow: string;
  status: string;
  amount: string;
  change: number | undefined;
  changeLabel: string;
}

export function HeroCard({ eyebrow, status, amount, change, changeLabel }: HeroCardProps) {
  const arrow = change === undefined || Math.abs(change) < 0.05 ? '—' : change > 0 ? '▲' : '▼';
  return (
    <div className="dash-hero">
      <div className="dash-hero-glow" />
      <div className="relative">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/60">{eyebrow}</div>
        <div className="mb-1 text-xl font-bold text-white">{status}</div>
      </div>
      <div className="dash-hero-amount">{amount}</div>
      <div className="dash-hero-badge">{arrow} {changeLabel}</div>
    </div>
  );
}
