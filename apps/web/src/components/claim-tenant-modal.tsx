'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api, setAccessToken } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

interface ClaimTenantResponse {
  accessToken: string;
  user: AuthUser;
}

interface Props {
  /** Called after the tenant has been claimed and the new token stored */
  onSuccess?: () => void;
}

export function ClaimTenantBanner({ onSuccess }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const claim = useMutation({
    mutationFn: async (tenantName: string) =>
      (await api.post<ClaimTenantResponse>('/auth/claim-tenant', { tenantName })).data,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(['me'], data.user);
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) claim.mutate(trimmed);
  };

  return (
    <div className="mx-auto mt-10 max-w-[420px] rounded-2xl bg-gradient-to-b from-white to-[#F0F2FF] px-10 py-12 text-center shadow-[0_4px_24px_rgba(59,91,219,0.08)]">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#5C7CFA] to-[#3B5BDB]">
        <Building2 className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-[20px] font-bold text-[#0F1729]">Set up your business account</h1>
      <p className="mt-2 text-[14px] text-[#5A6480]">
        Enter your business name to get started. You can add companies and branches after setup.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
        <input
          type="text"
          placeholder="Business name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[#E0E4F4] bg-white px-4 py-3 text-sm text-[#0F1729] outline-none focus:border-[#3B5BDB] focus:ring-2 focus:ring-[#3B5BDB]/20"
          disabled={claim.isPending}
          required
          maxLength={100}
        />
        {claim.isError && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}
        <button
          type="submit"
          disabled={claim.isPending || !name.trim()}
          className="w-full rounded-xl bg-[#3B5BDB] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2F4AB8] disabled:opacity-50"
        >
          {claim.isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Setting up…
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </div>
  );
}
