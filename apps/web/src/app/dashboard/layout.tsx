'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopNav } from '@/components/layout/topnav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar: logical border flips in RTL */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 start-0 w-60">
            <button type="button" aria-label="Close" className="absolute end-2 top-3 z-10 text-muted hover:text-white" onClick={() => setDrawer(false)}>
              <X className="h-5 w-5" />
            </button>
            <div onClick={() => setDrawer(false)} className="h-full"><Sidebar /></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav onMenu={() => setDrawer(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
