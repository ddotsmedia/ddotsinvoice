'use client';

import { useEffect, useState } from 'react';

// Company picked by a tenant admin (no company of their own). Sent as X-Company-Id on every API call.
const KEY = 'ddots.companyId';
const EVENT = 'ddots-company-change';

export const getStoredCompanyId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setStoredCompanyId = (id: string | null): void => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: selection lasts for this page only
  }
  window.dispatchEvent(new Event(EVENT));
};

/** Company the UI is working on: the user's own company, else the stored selection (tenant admins). */
export const useActiveCompanyId = (user: { role: string; companyId: string | null } | undefined): string | null => {
  const [stored, setStored] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setStored(getStoredCompanyId());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  if (!user) return null;
  if (user.role === 'tenant_admin' || !user.companyId) return stored;
  return user.companyId;
};
