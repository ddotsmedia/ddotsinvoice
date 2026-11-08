import type { Config } from 'tailwindcss';

const v = (name: string) => `var(--${name})`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: v('brand-900'), 800: v('brand-800'), 700: v('brand-700'), 600: v('brand-600'),
          500: v('brand-500'), 400: v('brand-400'), 100: v('brand-100'),
        },
        accent: v('accent'),
        primary: '#2563EB',
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        border: v('border'),
        secondary: v('text-secondary'),
        muted: v('text-muted'),
        sidebar: { bg: v('sidebar-bg'), text: v('sidebar-text'), hover: v('sidebar-hover-bg'), active: v('sidebar-active-bg') },
      },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,0.08)' },
    },
  },
  plugins: [],
};

export default config;
