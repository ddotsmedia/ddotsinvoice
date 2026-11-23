'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, LogOut, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useActiveCompanyId, setStoredCompanyId } from '@/lib/company';
import { useAuth, type AuthUser } from '@/lib/auth';
import { useUi } from '@/app/providers';
import { useLabel } from '@/lib/ui-helpers';
import { CreateCompanyModal } from '@/components/create-company-modal';
import { NotificationBell } from './notification-bell';

const iconBtn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-secondary hover:bg-surface-3 hover:text-primary';

// Breadcrumb from the URL: /dashboard/hr/payroll/x -> HR & Payroll / Payroll
function crumbs(pathname: string, L: (en: string, ar: string) => string): string[] {
  const seg = pathname.split('/').filter(Boolean).slice(1);
  const names: Record<string, [string, string]> = {
    invoicing: ['Invoicing', 'الفواتير'], purchasing: ['Purchasing', 'المشتريات'], payments: ['Payments', 'المدفوعات'],
    hr: ['HR & Payroll', 'الموارد البشرية'], accounting: ['Accounting', 'المحاسبة'], reports: ['Reports', 'التقارير'],
    budgets: ['Budgets', 'الموازنات'], customers: ['Customers', 'العملاء'], invoices: ['Invoices', 'الفواتير'],
    suppliers: ['Suppliers', 'الموردون'], payroll: ['Payroll', 'الرواتب'], employees: ['Employees', 'الموظفون'],
  };
  const out = [L('Dashboard', 'الرئيسية')];
  for (const s of seg) {
    if (/^[0-9a-f-]{8,}$/i.test(s)) continue;
    const n = names[s];
    out.push(n ? L(n[0], n[1]) : s.replace(/-/g, ' '));
  }
  return out;
}

// Tenant admins (or users without a company) pick the company they work on; stored in localStorage
function CompanySelector({ user }: { user: AuthUser | undefined }) {
  const qc = useQueryClient();
  const active = useActiveCompanyId(user);
  const show = !!user && (user.role === 'tenant_admin' || !user.companyId);
  const [createOpen, setCreateOpen] = useState(false);
  const list = useQuery({
    queryKey: ['companies-selector'],
    enabled: show,
    queryFn: async () => (await api.get<{ items: { id: string; name: string }[] }>('/companies', { params: { limit: 100 } })).data.items,
  });
  if (!show) return null;
  const hasCompanies = list.data && list.data.length > 0;
  return (
    <>
      <div className="flex items-center gap-2">
        {hasCompanies && (
          <select
            aria-label="Company"
            className="h-8 max-w-52 rounded-full border-0 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm cursor-pointer hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            value={active ?? ''}
            onChange={(e) => {
              setStoredCompanyId(e.target.value || null);
              void qc.invalidateQueries();
            }}
          >
            <option value="">Select company…</option>
            {list.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {list.data !== undefined && !hasCompanies && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Company
          </button>
        )}
      </div>
      <CreateCompanyModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(id) => {
          setStoredCompanyId(id);
          void qc.invalidateQueries();
        }}
      />
    </>
  );
}

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const t = useTranslations();
  const L = useLabel();
  const pathname = usePathname();
  const { locale, setLocale, theme, toggleTheme } = useUi();
  const { user, logout } = useAuth({ fetchUser: true });
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : '';
  const trail = crumbs(pathname, L);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      <button type="button" aria-label="Menu" className={`${iconBtn} md:hidden`} onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <nav className="hidden min-w-0 items-center gap-1 text-sm text-secondary sm:flex" aria-label="Breadcrumb">
        {trail.map((c, i) => (
          <span key={`${c}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted" />}
            <span className={i === trail.length - 1 ? 'font-semibold text-primary' : ''}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="ms-auto flex items-center gap-1">
        <CompanySelector user={user} />
        <button type="button" aria-label="Search" className={iconBtn}><Search className="h-4 w-4" /></button>
        <NotificationBell enabled={!!user && !!user.tenantId} />
        <button type="button" aria-label={t('nav.theme')} className={iconBtn} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button type="button" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-secondary hover:bg-surface-3" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
          {locale === 'ar' ? 'EN' : 'عربي'}
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger aria-label="Account" className="ms-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
            {initials}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" className="min-w-44 rounded-lg border border-border bg-white p-1 shadow-lg dark:bg-slate-900">
              <DropdownMenu.Item onSelect={() => void logout()} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-secondary outline-none hover:bg-surface-2 hover:text-primary">
                <LogOut className="h-4 w-4" />{t('nav.logout')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
