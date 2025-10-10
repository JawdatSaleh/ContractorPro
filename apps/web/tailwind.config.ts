import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Tajawal"', ...defaultTheme.fontFamily.sans]
      },
      container: {
        center: true,
        padding: '1rem'
      }
    }
  },
  plugins: []
} satisfies Config;
