import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Access token is kept in memory only (never localStorage)
let accessToken: string | null = null;
export const setAccessToken = (t: string | null): void => {
  accessToken = t;
};
export const hasAccessToken = (): boolean => accessToken !== null;

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4101';

export const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string> | null = null;
const refreshAccessToken = (): Promise<string> => {
  refreshing ??= axios
    .post<{ accessToken: string }>(`${BASE}/auth/refresh`, null, { withCredentials: true })
    .then((r) => {
      setAccessToken(r.data.accessToken);
      return r.data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/login') || config?.url?.startsWith('/auth/refresh');
    if (error.response?.status !== 401 || !config || config._retry || isAuthCall) {
      return Promise.reject(error);
    }
    config._retry = true;
    try {
      await refreshAccessToken();
      return api(config);
    } catch {
      setAccessToken(null);
      return Promise.reject(error);
    }
  },
);

export const apiError = (e: unknown): string => {
  const msg = (e as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? (e instanceof Error ? e.message : 'Request failed');
};
