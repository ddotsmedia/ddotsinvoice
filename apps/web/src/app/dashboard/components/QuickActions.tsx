'use client';

import Link from 'next/link';
import { FilePlus, UserPlus, CreditCard, BarChart3, ShoppingCart, FileText } from 'lucide-react';

const ACTIONS = [
  {
    href: '/dashboard/invoicing/invoices/new',
    icon: FilePlus,
    label: 'Create Invoice',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    border: 'hover:border-blue-200',
  },
  {
    href: '/dashboard/purchasing/supplier-invoices/new',
    icon: FileText,
    label: 'Record Bill',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    border: 'hover:border-amber-200',
  },
  {
    href: '/dashboard/payments/customer-payments/new',
    icon: CreditCard,
    label: 'Record Payment',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'hover:border-emerald-200',
  },
  {
    href: '/dashboard/invoicing/customers',
    icon: UserPlus,
    label: 'Add Customer',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    border: 'hover:border-purple-200',
  },
  {
    href: '/dashboard/purchasing/suppliers',
    icon: ShoppingCart,
    label: 'Add Supplier',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    border: 'hover:border-orange-200',
  },
  {
    href: '/dashboard/reports',
    icon: BarChart3,
    label: 'View Reports',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    border: 'hover:border-rose-200',
  },
];

export function QuickActions() {
  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-gray-100">
      <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      <div className="mt-4 space-y-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:bg-gray-50 ${a.border}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon className={`h-4 w-4 ${a.iconColor}`} />
              </span>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
              <span className="ms-auto text-gray-300">›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
