'use client';

import type { ReactNode } from 'react';

export const inputCls = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
export const btnCls = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50';
export const ghostBtnCls = 'inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-secondary hover:bg-surface-3 disabled:opacity-50';
export const cardCls = 'rounded-xl bg-surface shadow-card';
export const thCls = 'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-secondary';
export const tdCls = 'px-4 py-3 text-sm text-primary';

const TONES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700', ok: 'bg-emerald-50 text-emerald-700', trial: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-red-700', error: 'bg-red-50 text-red-700', inactive: 'bg-red-50 text-red-700',
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[value] ?? 'bg-surface-3 text-secondary'}`}>
      {label ?? value}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-secondary">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Notice({ kind = 'info', children, onClose }: { kind?: 'info' | 'error' | 'success'; children: ReactNode; onClose?: () => void }) {
  const cls = kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-brand-100 bg-brand-100 text-brand-700';
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${cls}`}>
      <div className="min-w-0 break-all">{children}</div>
      {onClose && <button type="button" onClick={onClose} className="shrink-0 text-xs font-semibold underline">Dismiss</button>}
    </div>
  );
}

export function Pager({ page, limit, total, onChange }: { page: number; limit: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm text-secondary">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <button type="button" className={ghostBtnCls} disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
        <span>{page} / {pages}</span>
        <button type="button" className={ghostBtnCls} disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function SecretBox({ label, value, onClose }: { label: string; value: string; onClose: () => void }) {
  return (
    <Notice kind="success" onClose={onClose}>
      <div className="font-semibold">{label}</div>
      <code className="mt-1 block select-all rounded bg-surface px-2 py-1 font-mono text-xs text-primary">{value}</code>
      <button type="button" className="mt-2 text-xs underline" onClick={() => void navigator.clipboard?.writeText(value)}>Copy</button>
    </Notice>
  );
}
