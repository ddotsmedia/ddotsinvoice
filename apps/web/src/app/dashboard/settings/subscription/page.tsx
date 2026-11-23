'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cardCls, btnCls, Modal } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';

interface SubStatus {
  plan: string;
  planExpiresAt: string | null;
  invoiceCountThisMonth: number;
  invoiceLimit: number | null;
  invoicesRemaining: number | null;
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 'AED 0/mo',
    features: ['5 invoices/month', '1 user', 'Basic reports', 'PDF download'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 'AED 49/mo',
    features: ['Unlimited invoices', 'Up to 5 users', 'All reports', 'PDF & email sending', 'Customer portal'],
    highlight: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: 'AED 149/mo',
    features: ['Unlimited everything', 'Up to 20 users', 'API access', 'Priority support', 'Multi-company', 'HR & Payroll'],
  },
];

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const L = useLabel();
  return (
    <Modal open={open} onOpenChange={onClose} title={L('Upgrade Plan', 'ترقية الخطة')}>
      <div className="space-y-4 text-sm">
        <p>{L('Contact us to upgrade your plan:', 'تواصل معنا لترقية خطتك:')}</p>
        <div className="rounded-lg bg-blue-50 p-4 space-y-2">
          <p className="font-semibold">Ddotsmedia Technologies LLC</p>
          <p dir="ltr">📞 +971 50 937 9212</p>
          <p dir="ltr">✉️ support@ddotsmedia.com</p>
        </div>
        <p className="text-muted text-xs">{L('We will activate your plan within 24 hours of payment.', 'سيتم تفعيل خطتك خلال 24 ساعة من الدفع.')}</p>
        <div className="flex justify-end">
          <button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={onClose}>{L('Close', 'إغلاق')}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function SubscriptionPage() {
  const L = useLabel();
  const [contactOpen, setContactOpen] = useState(false);

  const q = useQuery<SubStatus>({
    queryKey: ['subscription'],
    queryFn: async () => (await api.get<SubStatus>('/subscription/status')).data,
  });

  const current = q.data?.plan ?? 'free';
  const used = q.data?.invoiceCountThisMonth ?? 0;
  const limit = q.data?.invoiceLimit ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{L('Subscription', 'الاشتراك')}</h1>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 capitalize">
          {L('Current plan', 'الخطة الحالية')}: {current}
        </span>
      </div>

      {/* Usage bar for free plan */}
      {limit !== null && (
        <div className={`${cardCls} p-4 space-y-2`}>
          <div className="flex justify-between text-sm">
            <span>{L('Invoices this month', 'الفواتير هذا الشهر')}</span>
            <span className="font-mono">{used} / {limit}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${used >= limit ? 'bg-red-500' : used >= limit * 0.8 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
            />
          </div>
          {used >= limit && (
            <p className="text-xs text-red-600">{L('Invoice limit reached. Upgrade to create more invoices.', 'تم الوصول للحد. قم بالترقية لإنشاء فواتير إضافية.')}</p>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-2xl border p-6 space-y-4 ${plan.highlight ? 'border-blue-400 shadow-md' : 'border-border'} ${current === plan.key ? 'ring-2 ring-blue-500' : ''}`}
          >
            {plan.highlight && (
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{L('Most Popular', 'الأكثر شيوعاً')}</div>
            )}
            <div>
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="text-2xl font-semibold text-primary mt-1" dir="ltr">{plan.price}</p>
            </div>
            <ul className="space-y-2 text-sm text-secondary">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {current === plan.key ? (
              <div className="rounded-lg bg-slate-100 py-2 text-center text-sm font-medium text-slate-600">{L('Current Plan', 'خطتك الحالية')}</div>
            ) : (
              <button type="button" className={`${btnCls} w-full`} onClick={() => setContactOpen(true)}>
                {L('Upgrade', 'ترقية')}
              </button>
            )}
          </div>
        ))}
      </div>

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
