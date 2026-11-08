import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1B4FD8',
        surface: '#F8FAFC',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
};

export default config;
