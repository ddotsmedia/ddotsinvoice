import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Access token is kept in memory only (never localStorage)
let accessToken: string | null = null;
export const setAccessToken = (t: string | null): void => {
  accessToken = t;
};

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (typeof window !== 'undefined') {
    try {
      const cid = localStorage.getItem('ddots.companyId');
      if (cid) config.headers['X-Company-Id'] = cid; // honoured by the API for tenant admins only
    } catch {
      // storage unavailable
    }
  }
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
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(error);
    }
  },
);
