'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LayoutDashboard, LogOut, Settings, Users, Landmark } from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';

interface Me { id: string; email: string; firstName: string; lastName: string; role: string }

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/tenants', label: 'Tenants', icon: Landmark },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  // Every (dashboard) page is gated: no valid token or non-super_admin role → /login
  const me = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get<Me>('/auth/me')).data, retry: false });

  useEffect(() => {
    if (me.isError || (me.data && me.data.role !== 'super_admin')) router.replace('/login');
  }, [me.isError, me.data, router]);

  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    qc.clear();
    router.replace('/login');
  };

  if (!me.data || me.data.role !== 'super_admin') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-secondary">Checking session…</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sidebar-bg text-sidebar-text">
        <div className="px-5 py-5">
          <div className="font-bold text-white">DdotsInvoice</div>
          <div className="text-xs text-sidebar-text">Super Admin</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-sidebar-active text-white' : 'hover:bg-sidebar-hover hover:text-white'}`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-sm">
          <div className="truncate text-white">{me.data.firstName} {me.data.lastName}</div>
          <div className="truncate text-xs">{me.data.email}</div>
          <button type="button" onClick={logout} className="mt-3 inline-flex items-center gap-2 text-xs hover:text-white">
            <LogOut className="h-3.5 w-3.5" />Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
