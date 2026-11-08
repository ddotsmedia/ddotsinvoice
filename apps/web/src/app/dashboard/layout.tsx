'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useLabel } from '@/lib/ui-helpers';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/lib/auth';
import { useUi } from '@/app/providers';

const NAV = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/dashboard/companies', key: 'nav.companies' },
  { href: '/dashboard/users', key: 'nav.users' },
];

const ACCOUNTING = [
  { href: '/dashboard/accounting/chart-of-accounts', en: 'Chart of Accounts', ar: 'دليل الحسابات' },
  { href: '/dashboard/accounting/journals', en: 'Journal Entries', ar: 'قيود اليومية' },
  { href: '/dashboard/accounting/trial-balance', en: 'Trial Balance', ar: 'ميزان المراجعة' },
  { href: '/dashboard/accounting/fiscal-years', en: 'Fiscal Years', ar: 'السنوات المالية' },
];

const PURCHASING = [
  { href: '/dashboard/purchasing/suppliers', en: 'Suppliers', ar: 'الموردون' },
  { href: '/dashboard/purchasing/purchase-orders', en: 'Purchase Orders', ar: 'أوامر الشراء' },
  { href: '/dashboard/purchasing/goods-receipts', en: 'Goods Receipts', ar: 'استلام البضائع' },
  { href: '/dashboard/purchasing/supplier-invoices', en: 'Supplier Invoices', ar: 'فواتير الموردين' },
  { href: '/dashboard/purchasing/inventory', en: 'Inventory', ar: 'المخزون' },
];

const PAYMENTS = [
  { href: '/dashboard/payments/bank-accounts', en: 'Bank Accounts', ar: 'الحسابات البنكية' },
  { href: '/dashboard/payments/customer-payments', en: 'Receipts', ar: 'إيصالات العملاء' },
  { href: '/dashboard/payments/supplier-payments', en: 'Supplier Payments', ar: 'مدفوعات الموردين' },
  { href: '/dashboard/payments/bank-transactions', en: 'Bank Transactions', ar: 'الحركات البنكية' },
  { href: '/dashboard/payments/reconciliations', en: 'Reconciliations', ar: 'التسويات البنكية' },
];

const REPORTING = [
  { href: '/dashboard/reports', en: 'Reports', ar: 'التقارير' },
  { href: '/dashboard/budgets', en: 'Budgets', ar: 'الموازنات' },
];

const HR = [
  { href: '/dashboard/hr/departments', en: 'Departments', ar: 'الأقسام' },
  { href: '/dashboard/hr/employees', en: 'Employees', ar: 'الموظفون' },
  { href: '/dashboard/hr/leaves', en: 'Leaves', ar: 'الإجازات' },
  { href: '/dashboard/hr/payroll', en: 'Payroll', ar: 'الرواتب' },
  { href: '/dashboard/hr/eos', en: 'End of Service', ar: 'نهاية الخدمة' },
];

const INVOICING = [
  { href: '/dashboard/invoicing/customers', en: 'Customers', ar: 'العملاء' },
  { href: '/dashboard/invoicing/invoices?type=invoice', en: 'Invoices', ar: 'الفواتير' },
  { href: '/dashboard/invoicing/invoices?type=quote', en: 'Quotes', ar: 'عروض الأسعار' },
  { href: '/dashboard/invoicing/invoices?type=credit_note', en: 'Credit Notes', ar: 'إشعارات الدائن' },
  { href: '/dashboard/invoicing/reports/vat-summary', en: 'VAT Summary', ar: 'ملخص ضريبة القيمة المضافة' },
];

// Upcoming modules (greyed out)
const MODULES = [
  { key: 'invoices', phase: 'P2' },
  { key: 'customers', phase: 'P2' },
  { key: 'quotations', phase: 'P2' },
  { key: 'products', phase: 'P2' },
  { key: 'inventory', phase: 'P3' },
  { key: 'purchases', phase: 'P3' },
  { key: 'vendors', phase: 'P3' },
  { key: 'expenses', phase: 'P3' },
  { key: 'banking', phase: 'P4' },
  { key: 'accounting', phase: 'P4' },
  { key: 'vat', phase: 'P4' },
  { key: 'reports', phase: 'P5' },
  { key: 'payroll', phase: 'P5' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { locale, setLocale, theme, toggleTheme } = useUi();
  const { user, logout } = useAuth({ fetchUser: true });
  const L = useLabel();
  const [accountingOpen, setAccountingOpen] = useState(pathname.startsWith('/dashboard/accounting'));
  const [invoicingOpen, setInvoicingOpen] = useState(pathname.startsWith('/dashboard/invoicing'));
  const [purchasingOpen, setPurchasingOpen] = useState(pathname.startsWith('/dashboard/purchasing'));
  const [paymentsOpen, setPaymentsOpen] = useState(pathname.startsWith('/dashboard/payments'));
  const [hrOpen, setHrOpen] = useState(pathname.startsWith('/dashboard/hr'));
  const [reportingOpen, setReportingOpen] = useState(pathname.startsWith('/dashboard/reports') || pathname.startsWith('/dashboard/budgets'));

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : '';

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-e border-border bg-white p-4 md:block dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-lg font-bold text-primary">DdotsInvoice</div>
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setAccountingOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('Accounting', 'المحاسبة')}</span>
            <span>{accountingOpen ? '−' : '+'}</span>
          </button>
          {accountingOpen &&
            ACCOUNTING.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setInvoicingOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('Invoicing', 'الفواتير')}</span>
            <span>{invoicingOpen ? '−' : '+'}</span>
          </button>
          {invoicingOpen &&
            INVOICING.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href.split('?')[0]) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setPurchasingOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('Purchasing', 'المشتريات')}</span>
            <span>{purchasingOpen ? '−' : '+'}</span>
          </button>
          {purchasingOpen &&
            PURCHASING.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setPaymentsOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('Payments', 'المدفوعات')}</span>
            <span>{paymentsOpen ? '−' : '+'}</span>
          </button>
          {paymentsOpen &&
            PAYMENTS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setHrOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('HR & Payroll', 'الموارد البشرية')}</span>
            <span>{hrOpen ? '−' : '+'}</span>
          </button>
          {hrOpen &&
            HR.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <button
            type="button"
            onClick={() => setReportingOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span>{L('Reporting', 'التقارير والتحليل')}</span>
            <span>{reportingOpen ? '−' : '+'}</span>
          </button>
          {reportingOpen &&
            REPORTING.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`block rounded-md ps-6 pe-3 py-2 text-sm ${
                  pathname.startsWith(a.href) ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {L(a.en, a.ar)}
              </Link>
            ))}
          <div className="pt-4 text-xs uppercase text-slate-400">{t('nav.comingSoon')}</div>
          {MODULES.map((m) => (
            <div key={m.key} className="flex items-center justify-between px-3 py-2 text-sm text-slate-400">
              <span>{t(`modules.${m.key}`)}</span>
              <span className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{m.phase}</span>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="font-medium md:hidden">DdotsInvoice</span>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="rounded-md border border-border px-2 py-1 text-sm dark:border-slate-700"
            >
              {locale === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t('nav.theme')}
              className="rounded-md border border-border px-2 py-1 text-sm dark:border-slate-700"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {initials}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  className="min-w-40 rounded-md border border-border bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                >
                  <DropdownMenu.Item
                    onSelect={() => void logout()}
                    className="cursor-pointer rounded px-3 py-2 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {t('nav.logout')}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
