export type InsightCategory = 'collections' | 'receivables' | 'cashflow' | 'vat';

export interface Insight {
  category: InsightCategory;
  title: string;
  description: string;
}

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  collections: 'Collections',
  receivables: 'Receivables',
  cashflow: 'Cash Flow',
  vat: 'VAT',
};

export function AiInsights({ items }: { items: Insight[] }) {
  return (
    <div className="dash-card flex min-w-0 flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-violet-600 text-[10px] text-white">✦</span>
        <span className="dash-title">AI Copilot · Insights & Opportunities</span>
      </div>
      <div className="dash-insight-scroll">
        {items.map((i) => (
          <div key={i.title} className="dash-insight">
            <span className={`dash-chip ${i.category}`}>{CATEGORY_LABEL[i.category]}</span>
            <div className="text-[13px] font-bold leading-snug text-[var(--dash-fg)]">{i.title}</div>
            <div className="text-xs leading-relaxed text-[var(--dash-fg2)]">{i.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
