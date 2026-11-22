'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { btnCls } from '@/components/ui';
import { Building2, CheckCircle2, FileText, Plus, Receipt } from 'lucide-react';
import { CreateCompanyModal } from '@/components/create-company-modal';

interface Company { id: string; name: string; trn: string | null; currency: string; isActive: boolean }
interface Paged<T> { items: T[]; total: number }

function CompanyInitials({ name }: { name: string }) {
  const words = name.trim().split(/\s+/);
  const letters = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`
    : name.slice(0, 2);
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
      style={{ background: `hsl(${hue}, 60%, 40%)` }}
    >
      {letters.toUpperCase()}
    </div>
  );
}

function CompanyCard({ company, t }: { company: Company; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <CompanyInitials name={company.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{company.name}</h3>
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              company.isActive ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-slate-100 text-slate-500'
            }`}>
              {company.isActive && <CheckCircle2 className="h-3 w-3" />}
              {company.isActive ? t('common.active') : t('common.inactive')}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {company.trn && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Receipt className="h-3.5 w-3.5" />
                <span dir="ltr">TRN: {company.trn}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              <span>{company.currency}</span>
            </div>
          </div>
        </div>
      </div>
      {/* subtle accent line */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-brand-500 to-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function CompaniesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ['companies'],
    queryFn: async () => (await api.get<Paged<Company>>('/companies', { params: { limit: 100 } })).data,
  });

  const isLoading = list.isLoading;
  const isEmpty = !isLoading && (list.data?.total ?? 0) === 0;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('companies.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {!isEmpty && list.data ? `${list.data.total} ${list.data.total === 1 ? 'company' : 'companies'}` : 'Manage your business entities'}
          </p>
        </div>
        <button
          type="button"
          className={`${btnCls} gap-2 shadow-sm`}
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t('companies.add')}
        </button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center">
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}
          >
            <Building2 className="h-10 w-10 text-brand-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Set up your first company</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
            Add a company to start creating UAE-compliant invoices and tracking your finances.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1E4FC2, #3B82F6)' }}
          >
            <Plus className="h-4 w-4" />
            Create your first company
          </button>
        </div>
      )}

      {/* Company card grid */}
      {!isLoading && !isEmpty && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data?.items.map((c) => (
            <CompanyCard key={c.id} company={c} t={t} />
          ))}
        </div>
      )}

      <CreateCompanyModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={(id) => router.push(`/dashboard/invoicing?company=${id}&new=1`)}
      />
    </div>
  );
}
