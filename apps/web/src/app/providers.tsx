'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import ar from '@/messages/ar.json';
import en from '@/messages/en.json';

type Locale = 'ar' | 'en';

interface UiContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  theme: string;
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

function UiBridge({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    setLocaleState(read('locale') === 'ar' ? 'ar' : 'en');
  }, []);

  // RTL/LTR and lang attribute follow the selected language
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (l: Locale) => {
    write('locale', l);
    setLocaleState(l);
  };
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <UiContext.Provider value={{ locale, setLocale, theme: resolvedTheme ?? 'light', toggleTheme }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Dubai">
        {children}
        <Toaster richColors position="top-center" />
      </NextIntlClientProvider>
    </UiContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <UiBridge>{children}</UiBridge>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
