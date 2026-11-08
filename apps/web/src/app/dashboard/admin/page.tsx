'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserCheck, TrendingUp, Clock } from 'lucide-react';
import { money } from '@ddotsinvoice/money';
import { api } from '@/lib/api';
import { cardCls, StatusBadge } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface Overview {
  company: { id: string; name: string; nameAr: string | null; trn: string | null; logoUrl: string | null };
  userCount: number;
  activeEmployees: number;
  thisMonthRevenue: string;
  outstandingReceivables: string;
  recentActivity: { id: string; createdAt: string; action: string; module: string | null; userFirstName: string | null; userLastName: string | null }[];
}

const aed = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' });
const fmt = (v: string) => aed.format(Number(money(v).toFixed(2)));

export default function AdminOverviewPage() {
  const L = useLabel();
  const q = useQuery({ queryKey: ['admin-overview'], queryFn: async () => (await api.get<Overview>('/admin/overview')).data });
  const d = q.data;
  const kpis = d
    ? [
        { label: L('Users', 'المستخدمون'), value: String(d.userCount), icon: Users, color: '#2563EB' },
        { label: L('Active employees', 'الموظفون النشطون'), value: String(d.activeEmployees), icon: UserCheck, color: '#10B981' },
        { label: L('Revenue this month', 'إيرادات الشهر'), value: fmt(d.thisMonthRevenue), icon: TrendingUp, color: '#8B5CF6' },
        { label: L('Outstanding receivables', 'الذمم المدينة'), value: fmt(d.outstandingReceivables), icon: Clock, color: '#F59E0B' },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">{L('Company Overview', 'نظرة عامة على الشركة')}</h1>

      <div className={`${cardCls} flex items-center gap-4 p-5`}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
          {d?.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.company.logoUrl} alt="" className="h-full w-full rounded-xl object-contain" />
          ) : (
            <Building2 className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-primary">{d?.company.name ?? '…'}</div>
          <div className="text-sm text-secondary">{d?.company.nameAr ?? ''}</div>
          <div className="font-mono text-xs text-muted" dir="ltr">TRN: {d?.company.trn ?? '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`${cardCls} relative overflow-hidden p-5`} style={{ borderLeft: `4px solid ${k.color}` }}>
              <div className="text-sm text-secondary">{k.label}</div>
              <div className="mt-2 font-mono text-2xl font-bold text-primary" dir="ltr">{k.value}</div>
              <Icon className="absolute end-4 top-4 h-5 w-5" style={{ color: k.color }} />
            </div>
          );
        })}
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <h2 className="px-5 py-4 font-semibold text-primary">{L('Recent activity', 'النشاط الأخير')}</h2>
        <ul className="divide-y divide-border">
          {d?.recentActivity.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-primary">
                {`${a.userFirstName ?? ''} ${a.userLastName ?? ''}`.trim() || '—'} · <span className="font-mono text-xs">{a.action}</span>
              </span>
              {a.module && <StatusBadge status={a.module} />}
              <span className="font-mono text-xs text-muted" dir="ltr">{new Date(a.createdAt).toLocaleString('en-GB')}</span>
            </li>
          ))}
          {d && !d.recentActivity.length && (
            <li className="px-5 py-8 text-center text-sm text-muted">{L('No activity yet', 'لا يوجد نشاط بعد')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
