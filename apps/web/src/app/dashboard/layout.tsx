'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useUi } from '@/app/providers';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { locale, setLocale, theme, toggleTheme } = useUi();
  const { user, logout } = useAuth({ fetchUser: true });
  const [drawer, setDrawer] = useState(false);
  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : '';
  const btn = 'inline-flex h-9 items-center justify-center rounded-md border border-border px-2.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800';

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar (logical border flips in RTL) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-e border-border bg-white md:block dark:border-slate-800 dark:bg-slate-900">
        <div className="px-4 pb-2 pt-4 text-lg font-bold text-primary">DdotsInvoice</div>
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 overflow-y-auto bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 pt-4">
              <span className="text-lg font-bold text-primary">DdotsInvoice</span>
              <button type="button" aria-label="Close" className={btn} onClick={() => setDrawer(false)}><X className="h-4 w-4" /></button>
            </div>
            <div onClick={() => setDrawer(false)}><Sidebar /></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <button type="button" aria-label="Menu" className={`${btn} md:hidden`} onClick={() => setDrawer(true)}>
            <Menu className="h-4 w-4" />
          </button>
          <span className="font-semibold md:hidden">DdotsInvoice</span>
          <div className="ms-auto flex items-center gap-2">
            <button type="button" className={btn} onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
              {locale === 'ar' ? 'EN' : 'عربي'}
            </button>
            <button type="button" aria-label={t('nav.theme')} className={btn} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger aria-label="Account" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {initials}
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="min-w-40 rounded-md border border-border bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <DropdownMenu.Item onSelect={() => void logout()} className="cursor-pointer rounded px-3 py-2 text-sm outline-none hover:bg-slate-100 dark:hover:bg-slate-800">
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
