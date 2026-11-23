'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  Banknote, BarChart2, BarChart3, BookOpen, Boxes, Building2, CalendarDays, CalendarRange,
  ChevronDown, ChevronRight, CreditCard, FileMinus, FileText, LayoutDashboard, Landmark,
  ListTree, LogOut, PackageCheck, Receipt, ShoppingCart, Scale, Table as TableIcon, Target,
  Truck, UserRound, Users, Wallet, ArrowLeftRight, Shield, ScrollText, Settings,
} from 'lucide-react';
import { useLabel } from '@/lib/ui-helpers';
import { useAuth } from '@/lib/auth';

type Icon = ComponentType<{ className?: string }>;

interface Item { href: string; en: string; ar: string; icon: Icon }
interface Group {
  key: string; en: string; ar: string; icon: Icon;
  iconBg: string; iconColor: string;
  items: Item[];
}

const GROUPS: Group[] = [
  {
    key: 'invoicing', en: 'Invoicing', ar: 'الفواتير', icon: FileText,
    iconBg: 'bg-green-500/10', iconColor: 'text-green-400',
    items: [
      { href: '/dashboard/invoicing/invoices?type=invoice', en: 'Invoices', ar: 'الفواتير', icon: FileText },
      { href: '/dashboard/invoicing/invoices?type=quote', en: 'Quotes', ar: 'عروض الأسعار', icon: ScrollText },
      { href: '/dashboard/invoicing/invoices?type=credit_note', en: 'Credit Notes', ar: 'إشعارات الدائن', icon: FileMinus },
    ],
  },
  {
    key: 'crm', en: 'CRM', ar: 'العملاء', icon: Users,
    iconBg: 'bg-sky-500/10', iconColor: 'text-sky-400',
    items: [{ href: '/dashboard/invoicing/customers', en: 'Customers', ar: 'العملاء', icon: Users }],
  },
  {
    key: 'purchasing', en: 'Purchasing', ar: 'المشتريات', icon: ShoppingCart,
    iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400',
    items: [
      { href: '/dashboard/purchasing/suppliers', en: 'Suppliers', ar: 'الموردون', icon: Truck },
      { href: '/dashboard/purchasing/purchase-orders', en: 'Purchase Orders', ar: 'أوامر الشراء', icon: ShoppingCart },
      { href: '/dashboard/purchasing/goods-receipts', en: 'Goods Receipts', ar: 'استلام البضائع', icon: PackageCheck },
      { href: '/dashboard/purchasing/supplier-invoices', en: 'Supplier Invoices', ar: 'فواتير الموردين', icon: Receipt },
      { href: '/dashboard/purchasing/inventory', en: 'Inventory', ar: 'المخزون', icon: Boxes },
    ],
  },
  {
    key: 'payments', en: 'Payments', ar: 'المدفوعات', icon: CreditCard,
    iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400',
    items: [
      { href: '/dashboard/payments/customer-payments', en: 'Receipts', ar: 'إيصالات العملاء', icon: Wallet },
      { href: '/dashboard/payments/supplier-payments', en: 'Supplier Payments', ar: 'مدفوعات الموردين', icon: CreditCard },
      { href: '/dashboard/payments/bank-accounts', en: 'Bank Accounts', ar: 'الحسابات البنكية', icon: Landmark },
      { href: '/dashboard/payments/bank-transactions', en: 'Bank Transactions', ar: 'الحركات البنكية', icon: ArrowLeftRight },
      { href: '/dashboard/payments/reconciliations', en: 'Reconciliation', ar: 'التسويات البنكية', icon: Scale },
    ],
  },
  {
    key: 'hr', en: 'HR & Payroll', ar: 'الموارد البشرية', icon: UserRound,
    iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400',
    items: [
      { href: '/dashboard/hr/employees', en: 'Employees', ar: 'الموظفون', icon: UserRound },
      { href: '/dashboard/hr/departments', en: 'Departments', ar: 'الأقسام', icon: Building2 },
      { href: '/dashboard/hr/payroll', en: 'Payroll', ar: 'الرواتب', icon: Banknote },
      { href: '/dashboard/hr/leaves', en: 'Leaves', ar: 'الإجازات', icon: CalendarDays },
      { href: '/dashboard/hr/eos', en: 'End of Service', ar: 'نهاية الخدمة', icon: LogOut },
    ],
  },
  {
    key: 'accounting', en: 'Accounting', ar: 'المحاسبة', icon: BookOpen,
    iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400',
    items: [
      { href: '/dashboard/accounting/chart-of-accounts', en: 'Chart of Accounts', ar: 'دليل الحسابات', icon: ListTree },
      { href: '/dashboard/accounting/journals', en: 'Journal Entries', ar: 'قيود اليومية', icon: BookOpen },
      { href: '/dashboard/accounting/trial-balance', en: 'Trial Balance', ar: 'ميزان المراجعة', icon: TableIcon },
      { href: '/dashboard/accounting/fiscal-years', en: 'Fiscal Years', ar: 'السنوات المالية', icon: CalendarRange },
    ],
  },
  {
    key: 'reports', en: 'Reports', ar: 'التقارير', icon: BarChart3,
    iconBg: 'bg-rose-500/10', iconColor: 'text-rose-400',
    items: [
      { href: '/dashboard/reports/balance-sheet', en: 'Balance Sheet', ar: 'الميزانية العمومية', icon: BarChart3 },
      { href: '/dashboard/reports/income-statement', en: 'Income Statement', ar: 'قائمة الدخل', icon: BarChart3 },
      { href: '/dashboard/reports/trial-balance', en: 'Trial Balance', ar: 'ميزان المراجعة', icon: TableIcon },
      { href: '/dashboard/reports/cash-flow', en: 'Cash Flow', ar: 'التدفقات النقدية', icon: BarChart3 },
      { href: '/dashboard/reports/aging/receivables', en: 'Receivables Aging', ar: 'أعمار الذمم المدينة', icon: BarChart3 },
      { href: '/dashboard/reports/sales/by-customer', en: 'Sales by Customer', ar: 'المبيعات حسب العميل', icon: BarChart3 },
      { href: '/dashboard/reports/payroll/summary', en: 'Payroll Summary', ar: 'ملخص الرواتب', icon: Banknote },
    ],
  },
  {
    key: 'budgets', en: 'Budgets', ar: 'الموازنات', icon: Target,
    iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400',
    items: [{ href: '/dashboard/budgets', en: 'Budgets', ar: 'الموازنات', icon: Target }],
  },
];

const ADMIN_GROUP: Group = {
  key: 'admin', en: 'Admin', ar: 'الإدارة', icon: Shield,
  iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400',
  items: [
    { href: '/dashboard/admin/users', en: 'User Management', ar: 'إدارة المستخدمين', icon: Users },
    { href: '/dashboard/admin/roles', en: 'Roles & Permissions', ar: 'الأدوار والصلاحيات', icon: Shield },
    { href: '/dashboard/admin/audit-log', en: 'Audit Log', ar: 'سجل التدقيق', icon: ScrollText },
  ],
};

const SETTINGS_GROUP: Group = {
  key: 'settings', en: 'Settings', ar: 'الإعدادات', icon: Settings,
  iconBg: 'bg-slate-500/10', iconColor: 'text-slate-400',
  items: [
    { href: '/dashboard/admin/company', en: 'Company Profile', ar: 'ملف الشركة', icon: Building2 },
    { href: '/dashboard/settings/team', en: 'Team', ar: 'الفريق', icon: Users },
  ],
};

export function Sidebar() {
  const L = useLabel();
  const pathname = usePathname();
  const { user, logout } = useAuth({ fetchUser: true });
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([...GROUPS, SETTINGS_GROUP, ADMIN_GROUP].map((g) => [g.key, g.items.some((i) => pathname.startsWith(i.href.split('?')[0]))])),
  );
  const isAdmin = user?.role === 'company_admin' || user?.role === 'tenant_admin';
  const visibleGroups = isAdmin ? [...GROUPS, SETTINGS_GROUP, ADMIN_GROUP] : GROUPS;
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : '';

  return (
    <div className="flex h-full flex-col bg-sidebar-bg text-sidebar-text">
      {/* Logo */}
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 shadow-lg shadow-brand-500/30">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">DdotsInvoice</div>
            <div className="text-[10px] text-muted leading-none">Business Finance</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname === '/dashboard'
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${pathname === '/dashboard' ? 'bg-white/20' : 'bg-blue-500/10'}`}>
            <LayoutDashboard className={`h-4 w-4 ${pathname === '/dashboard' ? 'text-white' : 'text-blue-400'}`} />
          </span>
          {L('Dashboard', 'الرئيسية')}
        </Link>

        {/* Reports Overview */}
        <Link
          href="/dashboard/reports/overview"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith('/dashboard/reports/overview')
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
            <BarChart2 className="h-4 w-4 text-rose-400" />
          </span>
          {L('Reports', 'التقارير')}
        </Link>

        {/* Groups */}
        <div className="mt-2 space-y-0.5">
          {visibleGroups.map((g) => {
            const GroupIcon = g.icon;
            const isOpen = open[g.key] ?? false;
            return (
              <Collapsible.Root key={g.key} open={isOpen} onOpenChange={(v) => setOpen((s) => ({ ...s, [g.key]: v }))}>
                <Collapsible.Trigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${g.iconBg}`}>
                    <GroupIcon className={`h-4 w-4 ${g.iconColor}`} />
                  </span>
                  <span className="flex-1 text-start">{L(g.en, g.ar)}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Collapsible.Trigger>
                <Collapsible.Content className="ms-4 mt-0.5 space-y-0.5 border-s border-white/10 ps-3">
                  {g.items.map((it) => {
                    const ItemIcon = it.icon;
                    const base = it.href.split('?')[0];
                    const active = pathname === base || pathname.startsWith(`${base}/`);
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                          active
                            ? 'bg-sidebar-active text-white font-semibold'
                            : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                        }`}
                      >
                        <ItemIcon className="h-3.5 w-3.5" />
                        {L(it.en, it.ar)}
                        {active && <ChevronRight className="ms-auto h-3 w-3 text-white/60" />}
                      </Link>
                    );
                  })}
                </Collapsible.Content>
              </Collapsible.Root>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-white/10 px-3 py-3 hover:bg-white/5 transition-colors">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white shadow">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : ''}</div>
          <div className="truncate text-[10px] text-muted capitalize">{user?.role.replace(/_/g, ' ') ?? ''}</div>
        </div>
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => void logout()}
          className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
