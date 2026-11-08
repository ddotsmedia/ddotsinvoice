'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  Banknote, BarChart3, BookOpen, Boxes, Building2, CalendarDays, CalendarRange, ChevronDown, CreditCard, FileMinus,
  FileText, LayoutDashboard, Landmark, ListTree, LogOut, PackageCheck, Receipt, ShoppingCart, Scale,
  Table as TableIcon, Target, Truck, UserRound, Users, Wallet, ArrowLeftRight,
} from 'lucide-react';
import { useLabel } from '@/lib/ui-helpers';

type Icon = ComponentType<{ className?: string }>;
interface Item { href: string; en: string; ar: string; icon: Icon }
interface Group { key: string; en: string; ar: string; icon: Icon; items: Item[] }

const GROUPS: Group[] = [
  {
    key: 'invoicing', en: 'Invoicing', ar: 'الفواتير', icon: FileText,
    items: [
      { href: '/dashboard/invoicing/customers', en: 'Customers', ar: 'العملاء', icon: Users },
      { href: '/dashboard/invoicing/invoices?type=invoice', en: 'Invoices', ar: 'الفواتير', icon: FileText },
      { href: '/dashboard/invoicing/invoices?type=credit_note', en: 'Credit Notes', ar: 'إشعارات الدائن', icon: FileMinus },
    ],
  },
  {
    key: 'purchasing', en: 'Purchasing', ar: 'المشتريات', icon: ShoppingCart,
    items: [
      { href: '/dashboard/purchasing/suppliers', en: 'Suppliers', ar: 'الموردون', icon: Truck },
      { href: '/dashboard/purchasing/purchase-orders', en: 'Purchase Orders', ar: 'أوامر الشراء', icon: ShoppingCart },
      { href: '/dashboard/purchasing/goods-receipts', en: 'Goods Receipts', ar: 'استلام البضائع', icon: PackageCheck },
      { href: '/dashboard/purchasing/supplier-invoices', en: 'Supplier Invoices', ar: 'فواتير الموردين', icon: Receipt },
      { href: '/dashboard/purchasing/inventory', en: 'Inventory', ar: 'المخزون', icon: Boxes },
    ],
  },
  {
    key: 'payments', en: 'Payments', ar: 'المدفوعات', icon: Wallet,
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
    items: [
      { href: '/dashboard/accounting/chart-of-accounts', en: 'Chart of Accounts', ar: 'دليل الحسابات', icon: ListTree },
      { href: '/dashboard/accounting/journals', en: 'Journal Entries', ar: 'قيود اليومية', icon: BookOpen },
      { href: '/dashboard/accounting/trial-balance', en: 'Trial Balance', ar: 'ميزان المراجعة', icon: TableIcon },
      { href: '/dashboard/accounting/fiscal-years', en: 'Fiscal Years', ar: 'السنوات المالية', icon: CalendarRange },
    ],
  },
  {
    key: 'reports', en: 'Reports', ar: 'التقارير', icon: BarChart3,
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
    items: [{ href: '/dashboard/budgets', en: 'Budgets', ar: 'الموازنات', icon: Target }],
  },
];

export function Sidebar() {
  const L = useLabel();
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.key, g.items.some((i) => pathname.startsWith(i.href.split('?')[0]))])),
  );
  return (
    <nav className="space-y-1 p-3" aria-label="Main">
      <Link
        href="/dashboard"
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
          pathname === '/dashboard' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <LayoutDashboard className="h-4 w-4" />
        {L('Dashboard', 'الرئيسية')}
      </Link>
      {GROUPS.map((g) => {
        const GroupIcon = g.icon;
        return (
          <Collapsible.Root key={g.key} open={open[g.key]} onOpenChange={(v) => setOpen((s) => ({ ...s, [g.key]: v }))}>
            <Collapsible.Trigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="flex items-center gap-3"><GroupIcon className="h-4 w-4" />{L(g.en, g.ar)}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open[g.key] ? 'rotate-180' : ''}`} />
            </Collapsible.Trigger>
            <Collapsible.Content className="space-y-1 ps-4">
              {g.items.map((it) => {
                const ItemIcon = it.icon;
                const active = pathname === it.href.split('?')[0] || pathname.startsWith(it.href.split('?')[0] + '/');
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-sm ${
                      active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ItemIcon className="h-4 w-4" />
                    {L(it.en, it.ar)}
                  </Link>
                );
              })}
            </Collapsible.Content>
          </Collapsible.Root>
        );
      })}
    </nav>
  );
}
