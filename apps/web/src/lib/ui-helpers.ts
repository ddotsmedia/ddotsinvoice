'use client';

import { useUi } from '@/app/providers';

// Bilingual inline labels for accounting screens
export const useLabel = () => {
  const { locale } = useUi();
  return (en: string, ar: string): string => (locale === 'ar' ? ar : en);
};

export const errMsg = (e: unknown): string =>
  (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message?.toString() ?? 'Error';

export const stripEmpty = <T extends object>(v: T) =>
  Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined));
