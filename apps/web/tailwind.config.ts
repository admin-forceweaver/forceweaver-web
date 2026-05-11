import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    '../../domains/blog/**/*.{ts,tsx}',
    '../../domains/company/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'indigo-dye': '#173e63',
        'celestial-blue': '#00a1e0',
        'lavender-blush': '#f0e2e7',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
