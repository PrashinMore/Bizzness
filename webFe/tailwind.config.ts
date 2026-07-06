import type { Config } from 'tailwindcss';

/**
 * Bizzness design tokens — ledger-meets-modern-till aesthetic.
 * Tailwind v4 reads these via @config in globals.css; keep in sync with :root vars there.
 */
const config = {
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F2',
        ink: {
          DEFAULT: '#1C2333',
          light: '#2a3347',
          dark: '#151b28',
        },
        muted: '#5C6270',
        accent: {
          DEFAULT: '#B8894A',
          muted: '#F3EBDD',
          dark: '#9A7340',
        },
        success: {
          DEFAULT: '#2F5233',
          muted: '#E8EFE9',
        },
        warning: {
          DEFAULT: '#B8763A',
          muted: '#F5EBDF',
        },
        danger: {
          DEFAULT: '#A13F3F',
          muted: '#F5E8E8',
        },
        border: '#D8D2C4',
        surface: '#FFFFFF',
        /* Legacy aliases — map old brand-* usages to ink/accent palette */
        brand: {
          50: '#F3EBDD',
          100: '#E8D9C4',
          400: '#C9A06A',
          500: '#B8894A',
          600: '#1C2333',
          700: '#2a3347',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '0.625rem',
        panel: '0.75rem',
      },
      boxShadow: {
        soft: '0 1px 3px rgb(28 35 51 / 0.06), 0 8px 24px rgb(28 35 51 / 0.04)',
        lifted: '0 3px 10px rgb(28 35 51 / 0.07), 0 16px 40px rgb(28 35 51 / 0.06)',
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
} satisfies Config;

export default config;
