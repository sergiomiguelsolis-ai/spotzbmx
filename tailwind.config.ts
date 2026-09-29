import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0B0D',
        panel: '#131519',
        raise: '#1B1E23',
        line: '#2A2E35',
        chrome: '#D5D9DF',
        muted: '#80868F',
        volt: '#FFE600',
        ok: '#2EE66B',
        warn: '#FF9F1A',
        dead: '#FF3B47',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sheet: '0 -20px 60px -20px rgba(0,0,0,.8)',
      },
    },
  },
  plugins: [],
} satisfies Config;
