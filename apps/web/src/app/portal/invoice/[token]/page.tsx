'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { money } from '@ddotsinvoice/money';

const portalApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL ?? '/api' });

interface PortalLine {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineSubtotal: string;
  vatAmount: string;
  lineTotal: string;
}

interface BankDetails { bankName: string | null; iban: string | null; accountName: string | null }

interface PortalInvoice {
  id: string;
  number: string;
  date: string;
  dueDate?: string;
  subtotal: string;
  vatAmount: string;
  total: string;
  currency: string;
  company: { name: string; trn?: string };
  customer: { name: string };
  lines: PortalLine[];
  bankDetails: BankDetails | null;
  portalPaidAcknowledgedAt: string | null;
}

export default function PortalInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ackDone, setAckDone] = useState(false);

  const inv = useQuery({
    queryKey: ['portal', token],
    queryFn: async () => (await portalApi.get<PortalInvoice>(`/portal/invoice/${token}`)).data,
  });

  if (inv.isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading invoice…</p>
    </div>
  );

  if (inv.isError || !inv.data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
        <p className="text-gray-500">This link may have expired or is invalid.</p>
      </div>
    </div>
  );

  const ackMut = useMutation({
    mutationFn: async () => portalApi.post(`/portal/invoice/${token}/acknowledge`),
    onSuccess: () => setAckDone(true),
  });

  const d = inv.data;
  const alreadyAcknowledged = !!d?.portalPaidAcknowledgedAt || ackDone;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{d.company.name}</h1>
              {d.company.trn && <p className="text-blue-200 text-sm mt-1">TRN: {d.company.trn}</p>}
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs uppercase tracking-wide">Invoice</p>
              <p className="text-xl font-semibold" dir="ltr">{d.number}</p>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold text-gray-800">{d.customer.name}</p>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <p className="text-gray-500 text-xs">Invoice Date</p>
                <p className="font-medium text-gray-800">{d.date}</p>
              </div>
              {d.dueDate && (
                <div>
                  <p className="text-gray-500 text-xs">Due Date</p>
                  <p className="font-medium text-gray-800">{d.dueDate}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="px-8 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 text-left font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit Price</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{l.description}</td>
                  <td className="py-2 text-right text-gray-600 font-mono" dir="ltr">{money(l.quantity).toString()}</td>
                  <td className="py-2 text-right text-gray-600 font-mono" dir="ltr">{money(l.unitPrice).toFixed(2)}</td>
                  <td className="py-2 text-right font-mono font-medium" dir="ltr">{money(l.lineTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-8 pb-6">
          <div className="ms-auto w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono" dir="ltr">{money(d.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT 5%</span>
              <span className="font-mono" dir="ltr">{money(d.vatAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono" dir="ltr">{money(d.total).toFixed(2)} {d.currency}</span>
            </div>
          </div>
        </div>

        {/* Pay via Bank Transfer */}
        {(d.bankDetails || true) && (
          <div className="px-8 py-6 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Pay via Bank Transfer</h3>
            {d.bankDetails ? (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                {d.bankDetails.bankName && <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium text-gray-800">{d.bankDetails.bankName}</span></div>}
                {d.bankDetails.iban && <div className="flex justify-between"><span className="text-gray-500">IBAN</span><span className="font-mono font-medium text-gray-800" dir="ltr">{d.bankDetails.iban}</span></div>}
                {d.bankDetails.accountName && <div className="flex justify-between"><span className="text-gray-500">Account Name</span><span className="font-medium text-gray-800">{d.bankDetails.accountName}</span></div>}
                <p className="text-xs text-gray-500 pt-1">Please use invoice number <strong>{d.number}</strong> as your payment reference.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Please contact us for bank transfer details.</p>
            )}
            <div className="mt-4">
              {alreadyAcknowledged ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 font-medium">
                  ✓ Payment acknowledged — we will confirm receipt shortly
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => ackMut.mutate()}
                  disabled={ackMut.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {ackMut.isPending ? 'Sending…' : '✓ I have made the bank transfer'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">Powered by DdotsInvoice</p>
          <a
            href={`/api/invoicing/invoices/${d.id}/pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            download
          >
            Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
