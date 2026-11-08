'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { btnCls, cardCls } from '@/components/ui';
import { useLabel } from '@/lib/ui-helpers';
import type { Paged } from '@/lib/accounting-types';

interface BankAccount { id: string; code: string; nameEn: string; nameAr: string; bankName: string; accountNumber: string; iban: string | null; currency: string; isActive: boolean }

export default function BankAccountsPage() {
  const L = useLabel();
  const list = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => (await api.get<Paged<BankAccount>>('/payments/bank-accounts', { params: { limit: 100 } })).data,
  });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{L('Bank Accounts', 'الحسابات البنكية')}</h1>
        <Link href="/dashboard/payments/bank-accounts/new" className={btnCls}>{L('New Bank Account', 'حساب بنكي جديد')}</Link>
      </div>
      <div className={`${cardCls} overflow-x-auto`}>
        <table className="w-full text-start text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-start font-medium">{L('Code', 'الرمز')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Name', 'الاسم')}</th>
              <th className="px-4 py-3 text-start font-medium">{L('Bank', 'البنك')}</th>
              <th className="px-4 py-3 text-start font-medium">IBAN</th>
              <th className="px-4 py-3 text-start font-medium">{L('Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((b) => (
              <tr key={b.id} className="border-t border-border dark:border-slate-800">
                <td className="px-4 py-3 font-mono" dir="ltr">{b.code}</td>
                <td className="px-4 py-3">{L(b.nameEn, b.nameAr)}</td>
                <td className="px-4 py-3">{b.bankName}</td>
                <td className="px-4 py-3 font-mono" dir="ltr">{b.iban ?? '—'}</td>
                <td className="px-4 py-3">{b.isActive ? L('Active', 'نشط') : L('Inactive', 'غير نشط')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
