'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, BookOpen, Building2, CreditCard, FileText, Plus, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useActiveCompanyId, setStoredCompanyId } from '@/lib/company';
import { useLabel } from '@/lib/ui-helpers';
import { CreateCompanyModal } from '@/components/create-company-modal';
import { ClaimTenantBanner } from '@/components/claim-tenant-modal';
import { KpiCard } from './components/KpiCard';
import { HeroCard } from './components/HeroCard';
import { CashRunwayCard } from './components/CashRunwayCard';
import { TrendChart, type Period, type TrendPoint } from './components/TrendChart';
import { AiInsights, type Insight } from './components/AiInsights';
import { QuickActions, type QuickAction } from './components/QuickActions';
import { RecentInvoices } from './components/RecentInvoices';
import { OverdueBanner } from './components/OverdueBanner';
import './dashboard.css';

interface DashboardKpis {
  receivables: { amount: string; count: number };
  payables: { amount: string; count: number };
  cashPosition: { amount: string };
  netVat: { amount: string; from: string; to: string };
  recentInvoices: Array<{ id: string; invoiceNumber: string; customerName: string; total: string; status: string; dueDate: string }>;
  netProfitLast30: { amount: string };
  cashRunway: { weeks: number; accounts: Array<{ label: string; amount: string }> };
  overdueInvoices: { count: number; totalAmount: string };
  upcomingDue: { count: number; totalAmount: string };
  trendMonthly: Array<{ month: string; revenue: string; expenses: string }>;
}

// Display-only formatting; amounts stay decimal strings (Intl formats them exactly)
const aedFmt = new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const aed = (v: string) => `AED ${aedFmt.format(v as never)}`;

// Build trend series from real API data
function buildTrendSeries(trendMonthly: Array<{ month: string; revenue: string; expenses: string }>): Record<Period, TrendPoint[]> {
  const livePoints: TrendPoint[] = trendMonthly.map((m) => ({
    label: m.month,
    value: parseFloat(m.revenue) - parseFloat(m.expenses),
  }));
  // Placeholder periods — only '1M' (last 6 months) is real
  return {
    '1D': livePoints,
    '1W': livePoints,
    '1M': livePoints,
    '1Y': livePoints,
    All: livePoints,
  };
}

// Build AI insights from real KPI data
function buildInsights(k: DashboardKpis): Insight[] {
  const aedFmtInsight = new Intl.NumberFormat('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmt = (v: string) => `AED ${aedFmtInsight.format(parseFloat(v))}`;
  const insights: Insight[] = [];
  if (k.overdueInvoices.count > 0) {
    insights.push({ category: 'collections', title: `${k.overdueInvoices.count} invoice${k.overdueInvoices.count === 1 ? '' : 's'} overdue — send payment reminders`, description: `${fmt(k.overdueInvoices.totalAmount)} outstanding across ${k.overdueInvoices.count} overdue invoice${k.overdueInvoices.count === 1 ? '' : 's'}. Send formal payment reminders or consider escalation.` });
  }
  if (k.upcomingDue.count > 0) {
    insights.push({ category: 'receivables', title: `${k.upcomingDue.count} invoice${k.upcomingDue.count === 1 ? '' : 's'} due in 14 days`, description: `${fmt(k.upcomingDue.totalAmount)} due soon across ${k.upcomingDue.count} invoice${k.upcomingDue.count === 1 ? '' : 's'}. Send proactive payment reminders now.` });
  }
  const vatNum = parseFloat(k.netVat.amount);
  if (vatNum !== 0) {
    insights.push({ category: 'vat', title: vatNum > 0 ? 'VAT payable this quarter' : 'VAT credit this quarter', description: `Net VAT ${vatNum > 0 ? 'payable' : 'credit'}: ${fmt(k.netVat.amount)} for period ${k.netVat.from} to ${k.netVat.to}.` });
  }
  if (k.cashRunway.weeks < 12) {
    insights.push({ category: 'cashflow', title: `Low cash runway — ${k.cashRunway.weeks} week${k.cashRunway.weeks === 1 ? '' : 's'} remaining`, description: 'Cash reserves are running low. Review upcoming expenses and accelerate receivables collection.' });
  } else {
    insights.push({ category: 'cashflow', title: `Cash position healthy — ${fmt(k.cashPosition.amount)} across ${k.cashRunway.accounts.length} account${k.cashRunway.accounts.length === 1 ? '' : 's'}`, description: `Current runway: ${k.cashRunway.weeks} weeks. Consider short-term investments for idle cash.` });
  }
  return insights;
}

const ACTIONS: QuickAction[] = [
  { href: '/dashboard/invoicing/invoices/new', label: 'Create Invoice', description: 'Generate a new sales invoice', icon: FileText, bg: '#EEF2FF', color: '#4F46E5' },
  { href: '/dashboard/purchasing/supplier-invoices/new', label: 'Record Bill', description: 'Enter a vendor bill', icon: Receipt, bg: '#ECFDF5', color: '#059669' },
  { href: '/dashboard/payments/customer-payments/new', label: 'Record Payment', description: 'Log customer receipt', icon: CreditCard, bg: '#EFF6FF', color: '#2563EB' },
  { href: '/dashboard/accounting/journals/new', label: 'New Journal Entry', description: 'Post a manual journal', icon: BookOpen, bg: '#FFF7ED', color: '#EA580C' },
  { href: '/dashboard/reports', label: 'View Reports', description: 'P&L, Balance Sheet, VAT', icon: BarChart3, bg: '#FAF5FF', color: '#7C3AED' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const L = useLabel();
  const { user } = useAuth({ fetchUser: true });
  const companyId = useActiveCompanyId(user);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const kpisQ = useQuery({
    queryKey: ['dashboard-kpis', companyId],
    queryFn: async () => (await api.get<DashboardKpis>('/dashboard/kpis')).data,
    enabled: !!companyId,
  });
  const k = kpisQ.data;
  const kpiCards = k && [
    { label: 'Receivables', amount: aed(k.receivables.amount), sub: `${k.receivables.count} open invoice${k.receivables.count === 1 ? '' : 's'}` },
    { label: 'Payables', amount: aed(k.payables.amount), sub: `${k.payables.count} open bill${k.payables.count === 1 ? '' : 's'}` },
    { label: 'Cash Position', amount: aed(k.cashPosition.amount), sub: 'Bank + Cash' },
    { label: 'Net VAT', amount: aed(k.netVat.amount), sub: `Output − Input · ${k.netVat.from} to ${k.netVat.to}` },
  ];

  if (!user) return <div className="p-8 text-sm text-[var(--dash-fg3)]">Loading…</div>;

  // User exists but has no tenant — created before tenant assignment (e.g. via admin).
  // Show setup step so we can claim a tenant and get a valid JWT before creating companies.
  if (!user.tenantId) {
    return <ClaimTenantBanner onSuccess={() => void qc.invalidateQueries()} />;
  }

  if (!companyId) {
    return (
      <>
        <div className="mx-auto mt-10 max-w-[420px] rounded-2xl bg-gradient-to-b from-white to-[#F0F2FF] px-10 py-12 text-center shadow-[0_4px_24px_rgba(59,91,219,0.08)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5C7CFA] to-[#3B5BDB]">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0F1729]">{L('Select a company to view dashboard', 'اختر شركة لعرض لوحة المعلومات')}</h1>
          <p className="mt-2 text-[14px] text-[#5A6480]">{L('Use the company selector in the top bar, or create your first company below.', 'استخدم قائمة الشركات في الشريط العلوي، أو أنشئ شركتك الأولى أدناه.')}</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#3B5BDB] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4AB8]"
          >
            <Plus className="h-4 w-4" />
            {L('Create your first company', 'إنشاء شركتك الأولى')}
          </button>
        </div>
        <CreateCompanyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(id) => { setStoredCompanyId(id); void qc.invalidateQueries(); }}
        />
      </>
    );
  }

  return (
    <div className="dash-root -m-4 min-h-screen bg-[var(--dash-bg)] p-4 md:-m-6 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--dash-fg)]">
            {getGreeting()}, {user.firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-[var(--dash-fg2)]">
            <span className="text-[var(--dash-fg3)]">
              {k ? 'Live figures' : kpisQ.isError ? 'Could not load live figures' : 'Loading live figures…'}
            </span>
          </p>
        </div>

        <div className="dash-kpi-row">
          {kpiCards
            ? kpiCards.map((c) => <KpiCard key={c.label} label={c.label} amount={c.amount} sub={c.sub} />)
            : ['Receivables', 'Payables', 'Cash Position', 'Net VAT'].map((l) => (
                <div key={l} className="dash-card flex animate-pulse flex-col gap-2" aria-busy="true">
                  <div className="h-3 w-20 rounded bg-gray-200" />
                  <div className="h-7 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-200" />
                </div>
              ))}
        </div>

        {k && k.overdueInvoices.count > 0 && (
          <OverdueBanner count={k.overdueInvoices.count} totalAmount={k.overdueInvoices.totalAmount} />
        )}

        <div className="dash-main-grid">
          <HeroCard
            eyebrow="Net Profit · Last 30 Days"
            status={k ? (parseFloat(k.netProfitLast30.amount) >= 0 ? 'Profitable' : 'Loss') : 'Loading…'}
            amount={k ? aed(k.netProfitLast30.amount) : '—'}
            change={undefined}
            changeLabel="vs previous 30 days"
          />
          <CashRunwayCard
            weeks={k?.cashRunway.weeks ?? 0}
            description={k ? (k.cashRunway.weeks >= 52 ? 'Excellent runway · over 1 year of cash reserves' : k.cashRunway.weeks >= 12 ? 'Adequate runway' : 'Low runway — monitor cash closely') : 'Loading…'}
            accounts={(k?.cashRunway.accounts ?? []).map((a) => ({ label: a.label, value: aed(a.amount) }))}
          />
          <div className="dash-trend">
            {k?.trendMonthly ? (
              <TrendChart series={buildTrendSeries(k.trendMonthly)} initial="1M" />
            ) : (
              <div className="dash-card flex h-full animate-pulse items-center justify-center text-sm text-[var(--dash-fg3)]">Loading…</div>
            )}
          </div>
        </div>

        {k && k.upcomingDue.count > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="text-amber-600 text-sm font-semibold">
              {k.upcomingDue.count} invoice{k.upcomingDue.count === 1 ? '' : 's'} due in 14 days · {aed(k.upcomingDue.totalAmount)}
            </span>
            <a href="/dashboard/invoicing/invoices?due_soon=1" className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-800">
              Send Reminders →
            </a>
          </div>
        )}

        <div className="dash-bottom-row">
          <AiInsights items={k ? buildInsights(k) : []} />
          <QuickActions actions={ACTIONS} />
        </div>

        <RecentInvoices invoices={k?.recentInvoices ?? []} />
      </div>
    </div>
  );
}
