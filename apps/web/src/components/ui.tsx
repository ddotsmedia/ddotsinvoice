'use client';

import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary outline-none transition-colors focus:ring-2 focus:ring-brand-500 focus:border-transparent hover:border-slate-300 dark:bg-slate-800 dark:hover:border-slate-600';
export const btnCls =
  'inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
export const btnOutlineCls =
  'inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';
export const cardCls =
  'rounded-xl border border-border bg-white shadow-card dark:bg-slate-900 dark:border-slate-700';
export const labelCls = 'mb-1 block text-sm font-medium text-secondary';
export const sectionCls = 'mb-4 border-b border-border pb-2 text-base font-semibold text-primary';
export const thCls = 'bg-surface-2 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-secondary';
export const trCls = 'border-t border-border hover:bg-surface-2 dark:border-slate-800';

// Pill status badge: draft / posted / partial / paid / cancelled
const BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  posted: 'bg-blue-50 text-blue-700',
  active: 'bg-blue-50 text-blue-700',
  approved: 'bg-blue-50 text-blue-700',
  partially_paid: 'bg-amber-50 text-amber-700',
  overdue: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  fully_paid: 'bg-emerald-50 text-emerald-700',
  reconciled: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  voided: 'bg-red-50 text-red-700',
  void: 'bg-red-50 text-red-700',
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <Dialog.Title className="mb-4 text-lg font-semibold">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
