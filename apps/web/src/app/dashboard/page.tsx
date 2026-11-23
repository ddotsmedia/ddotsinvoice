'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, BookOpen, Building2, CreditCard, FileText, Plus, Receipt } from 'lucide-react';
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
import './dashboard.css';

// ── Mock data (hardcoded until the dashboard API is wired up) ─────────────
const KPIS = [
  { label: 'Receivables', amount: 'AED 602,238', change: 15.8, sub: 'vs 30d · Outstanding invoices' },
  { label: 'Payables', amount: 'AED 117,525', change: 2.5, sub: 'vs 30d · Outstanding bills' },
  { label: 'Cash Position', amount: 'AED 1,126,250', change: 0, sub: 'vs 30d · Bank + Cash' },
  { label: 'Net VAT', amount: '−AED 5,596', change: 85.4, sub: 'vs 30d · Output − Input VAT' },
];

const TREND: Record<Period, TrendPoint[]> = {
  '1D': ['9AM', '10', '11', '12PM', '1', '2', '3', '4', '5'].map((label, i) => ({ label, value: [1200, 1800, 1400, 2100, 1900, 2400, 2200, 2600, 2800][i] })),
  '1W': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, value: [5200, 7800, 6400, 9100, 8200, 7600, 10200][i] })),
  '1M': ['03/11', '05', '07', '09', '11', '13', '15', '17', '19', '21', '23', '25', '27', '29', '01/12', '03'].map((label, i) => ({
    label,
    value: [1200, 15800, 9400, 11100, 10200, 12800, 8600, 13400, 9100, 11200, 7800, 12600, -1200, 10400, 11800, 9200][i],
  })),
  '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, i) => ({
    label,
    value: [32000, 28000, 45000, 39000, 52000, 48000, 61000, 57000, 43000, 69000, 74000, 79273][i],
  })),
  All: ['2022', '2023', 'Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'].map((label, i) => ({ label, value: [120000, 185000, 45000, 52000, 61000, 79273][i] })),
};

const INSIGHTS: Insight[] = [
  { category: 'collections', title: 'Escalate collection for DAMAC Properties', description: 'AED 82,399 is over 90 days overdue. Send formal demand letter or consider legal action.' },
  { category: 'collections', title: 'Call DAMAC Properties', description: 'AED 92,206 overdue for 172 days. Escalate to management — consider external collection.' },
  { category: 'vat', title: 'VAT return filing due in 12 days', description: 'Q3 2024-25 VAT return must be filed by Dec 28. Net payable estimated at AED 5,596.' },
  { category: 'cashflow', title: 'Strong cash position — consider short-term investment', description: 'AED 624K idle cash on hand could earn 4–5% in a UAE T-bill or term deposit.' },
  { category: 'receivables', title: '3 invoices approaching 60-day mark', description: 'Send payment reminders to Al Futtaim, Emaar, and Majid Al Futtaim before they go overdue.' },
];

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
            FY 2024–25 · <span className="text-[var(--dash-fg3)]">Sample figures — live data not connected yet</span>
          </p>
        </div>

        <div className="dash-kpi-row">
          {KPIS.map((k) => (
            <KpiCard key={k.label} label={k.label} amount={k.amount} change={k.change} sub={k.sub} />
          ))}
        </div>

        <div className="dash-main-grid">
          <HeroCard
            eyebrow="Net Profit · Last 30 Days"
            status="Healthy"
            amount="AED 79,273"
            change={3815.9}
            changeLabel="+3,815.9% vs previous month"
          />
          <CashRunwayCard
            weeks={288}
            description="Excellent runway · over 1 year of cash reserves"
            accounts={[
              { label: 'Corporate Account', value: 'AED 500,000' },
              { label: 'Cash on Hand', value: 'AED 624,250' },
            ]}
          />
          <div className="dash-trend">
            <TrendChart series={TREND} initial="1M" />
          </div>
        </div>

        <div className="dash-bottom-row">
          <AiInsights items={INSIGHTS} />
          <QuickActions actions={ACTIONS} />
        </div>
      </div>
    </div>
  );
}
