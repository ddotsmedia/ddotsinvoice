'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import ar from '@/messages/ar.json';
import en from '@/messages/en.json';

type Locale = 'ar' | 'en';
type Theme = 'light' | 'dark';

interface UiContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: Theme;
  toggleTheme: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);
const MESSAGES = { ar, en } as const;

export const useUi = (): UiContextValue => {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <Providers>');
  return ctx;
};

// localStorage is a per-viewer convenience only; guarded for private mode / blocked storage
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  const [locale, setLocaleState] = useState<Locale>('ar');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setLocaleState(read('locale') === 'en' ? 'en' : 'ar');
    setTheme(read('theme') === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setLocale = (l: Locale) => {
    write('locale', l);
    setLocaleState(l);
  };
  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    write('theme', next);
    setTheme(next);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <UiContext.Provider value={{ locale, setLocale, theme, toggleTheme }}>
        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Dubai">
          {children}
        </NextIntlClientProvider>
      </UiContext.Provider>
    </QueryClientProvider>
  );
}
