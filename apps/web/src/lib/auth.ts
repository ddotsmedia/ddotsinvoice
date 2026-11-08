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
    router.replace('/dashboard');
  };

  const logout = async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    qc.clear();
    router.replace('/login');
  };

  return { user: me.data, isLoading: me.isLoading, isError: me.isError, login, logout };
}
