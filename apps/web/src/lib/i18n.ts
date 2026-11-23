export const translations: Record<string, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    reports: 'Reports',
    customers: 'Customers',
    settings: 'Settings',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    invoices: 'الفواتير',
    reports: 'التقارير',
    customers: 'العملاء',
    settings: 'الإعدادات',
  },
};

export const t = (key: string, lang: string): string =>
  translations[lang]?.[key] ?? translations.en[key] ?? key;
