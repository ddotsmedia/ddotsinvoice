'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { ADMIN_ROLES } from '@/lib/admin';
import { cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

// Company admin panel: company_admin and tenant_admin only
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth({ fetchUser: true });
  const L = useLabel();
  if (isLoading) return <div className="p-6 text-sm text-muted">{L('Loading…', 'جارٍ التحميل…')}</div>;
  if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
    return (
      <div className={`${cardCls} mx-auto mt-10 max-w-md p-8 text-center`}>
        <h1 className="text-lg font-semibold text-primary">{L('Access denied', 'تم رفض الوصول')}</h1>
        <p className="mt-2 text-sm text-secondary">{L('Company administrators only.', 'للمديرين فقط.')}</p>
      </div>
    );
  }
  return <>{children}</>;
}
