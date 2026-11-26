'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from './api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  companyId: string | null;
}

export function useAuth({ fetchUser = false }: { fetchUser?: boolean } = {}) {
  const qc = useQueryClient();
  const router = useRouter();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<AuthUser>('/auth/me')).data,
    enabled: fetchUser,
  });

  const login = async (email: string, password: string): Promise<void> => {
    const { data } = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    qc.setQueryData(['me'], data.user);
    // Clear stale company selection so a previous session's X-Company-Id doesn't bleed through
    try { localStorage.removeItem('ddots.companyId'); } catch { /* storage unavailable */ }
    router.replace('/dashboard');
  };

  const logout = async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    qc.clear();
    // Clear stored company selection so the next login doesn't send a stale X-Company-Id header
    try { localStorage.removeItem('ddots.companyId'); } catch { /* storage unavailable */ }
    router.replace('/login');
  };

  return { user: me.data, isLoading: me.isLoading, isError: me.isError, login, logout };
}
