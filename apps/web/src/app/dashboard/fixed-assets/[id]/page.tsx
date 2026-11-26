'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { btnCls, btnOutlineCls, cardCls, inputCls, labelCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface FixedAsset {
  id: string; code: string; name: string; nameAr: string | null; category: string | null;
  acquisitionDate: string; acquisitionCost: string; residualValue: string;
  accumulatedDepreciation: string; usefulLifeMonths: number;
  depreciationMethod: string; status: string; disposalDate: string | null;
  disposalValue: string | null; disposalNotes: string | null;
  location: string | null; serialNumber: string | null;
}
interface ScheduleRow { period: string; amount: number; bookValue: number; posted: string }

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fully_depreciated: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  disposed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  idle: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function FixedAssetDetailPage() {
  const L = useLabel();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [dispose, setDispose] = useState({ disposalDate: '', disposalValue: '', disposalNotes: '' });

  const asset = useQuery<FixedAsset>({
    queryKey: ['fixed-asset', id],
    queryFn: async () => (await api.get(`/fixed-assets/${id}`)).data,
  });

  const schedule = useQuery<ScheduleRow[]>({
    queryKey: ['fixed-asset-schedule', id],
    queryFn: async () => (await api.get(`/fixed-assets/${id}/depreciation-schedule`)).data,
    enabled: showSchedule,
  });

  const disposeMut = useMutation({
    mutationFn: (data: typeof dispose) => api.post(`/fixed-assets/${id}/dispose`, {
      ...data, disposalValue: Number(data.disposalValue),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fixed-asset', id] }); setDisposeOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/fixed-assets/${id}`),
    onSuccess: () => router.replace('/dashboard/fixed-assets'),
  });

  const a = asset.data;
  if (!a) return <div className="p-6 text-muted">{asset.isLoading ? L('Loading…', 'جاري التحميل…') : L('Not found', 'غير موجود')}</div>;

  const cost = Number(a.acquisitionCost);
  const acc = Number(a.accumulatedDepreciation);
  const nbv = cost - acc;
  const fmt = (n: number) => n.toLocaleString('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{L(a.name, a.nameAr ?? a.name)}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? ''}`}>
              {a.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-muted" dir="ltr">{a.code} {a.category ? `· ${a.category}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {a.status === 'active' && (
            <button className={btnOutlineCls} onClick={() => setDisposeOpen(true)}>
              {L('Dispose', 'استبعاد')}
            </button>
          )}
          <button className="text-red-500 hover:text-red-600" onClick={() => { if (confirm(L('Delete this asset?', 'حذف هذا الأصل؟'))) deleteMut.mutate(); }}>
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: L('Acquisition Cost', 'تكلفة الاقتناء'), value: fmt(cost) },
          { label: L('Accumulated Dep.', 'الاستهلاك المتراكم'), value: fmt(acc) },
          { label: L('Net Book Value', 'القيمة الدفترية'), value: fmt(nbv) },
        ].map((k) => (
          <div key={k.label} className={`${cardCls} p-4`}>
            <p className="text-xs text-muted">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className={`${cardCls} p-5`}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">{L('Asset Details', 'تفاصيل الأصل')}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            [L('Acquisition Date', 'تاريخ الاقتناء'), a.acquisitionDate],
            [L('Useful Life', 'العمر الإنتاجي'), `${a.usefulLifeMonths} ${L('months', 'شهراً')} (${Math.round(a.usefulLifeMonths / 12 * 10) / 10} ${L('yrs', 'سنة')})`],
            [L('Depreciation Method', 'طريقة الاستهلاك'), a.depreciationMethod.replace('_', ' ')],
            [L('Residual Value', 'القيمة المتبقية'), fmt(Number(a.residualValue))],
            a.location ? [L('Location', 'الموقع'), a.location] : null,
            a.serialNumber ? [L('Serial Number', 'الرقم التسلسلي'), a.serialNumber] : null,
            a.disposalDate ? [L('Disposal Date', 'تاريخ الاستبعاد'), a.disposalDate] : null,
            a.disposalValue ? [L('Disposal Value', 'قيمة الاستبعاد'), fmt(Number(a.disposalValue))] : null,
          ].filter(Boolean).map((row) => { const [k, v] = row as [string, string]; return (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ); })}
        </dl>
      </div>

      {/* Depreciation schedule toggle */}
      <div className={cardCls}>
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold"
          onClick={() => setShowSchedule((v) => !v)}
        >
          {L('Depreciation Schedule', 'جدول الاستهلاك')}
          {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showSchedule && (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{L('Period', 'الفترة')}</th>
                  <th className="px-4 py-2 text-end font-medium">{L('Depreciation', 'الاستهلاك')}</th>
                  <th className="px-4 py-2 text-end font-medium">{L('Book Value', 'القيمة الدفترية')}</th>
                  <th className="px-4 py-2 text-start font-medium">{L('Status', 'الحالة')}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.data?.map((row) => (
                  <tr key={row.period} className="border-t border-border dark:border-slate-800">
                    <td className="px-4 py-2 font-mono text-xs" dir="ltr">{row.period}</td>
                    <td className="px-4 py-2 text-end font-mono" dir="ltr">{fmt(row.amount)}</td>
                    <td className="px-4 py-2 text-end font-mono" dir="ltr">{fmt(row.bookValue)}</td>
                    <td className="px-4 py-2 text-xs text-muted">{row.posted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispose dialog */}
      {disposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${cardCls} w-full max-w-md p-6 shadow-2xl`}>
            <h3 className="mb-4 text-lg font-semibold">{L('Dispose Asset', 'استبعاد الأصل')}</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>{L('Disposal Date', 'تاريخ الاستبعاد')} *</label>
                <input type="date" className={inputCls} value={dispose.disposalDate} onChange={(e) => setDispose((p) => ({ ...p, disposalDate: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>{L('Disposal Value (AED)', 'قيمة الاستبعاد')}</label>
                <input type="number" min="0" step="0.01" className={inputCls} value={dispose.disposalValue} onChange={(e) => setDispose((p) => ({ ...p, disposalValue: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>{L('Notes', 'الملاحظات')}</label>
                <textarea rows={3} className={inputCls} value={dispose.disposalNotes} onChange={(e) => setDispose((p) => ({ ...p, disposalNotes: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button className={btnOutlineCls} onClick={() => setDisposeOpen(false)}>{L('Cancel', 'إلغاء')}</button>
              <button
                className={btnCls}
                disabled={!dispose.disposalDate || disposeMut.isPending}
                onClick={() => disposeMut.mutate(dispose)}
              >
                {disposeMut.isPending ? L('Saving…', 'جاري الحفظ…') : L('Confirm Disposal', 'تأكيد الاستبعاد')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
