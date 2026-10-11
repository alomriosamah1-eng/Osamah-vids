/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        panel: 'var(--panel)',
        brd: 'var(--brd)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        dim: 'var(--dim)',
        accent: {
          cyan: 'var(--accent-cyan)',
          violet: 'var(--accent-violet)',
          amber: 'var(--accent-amber)',
          emerald: 'var(--accent-emerald)',
          rose: 'var(--accent-rose)',
        },
      },
      fontFamily: {
        display: ['Cairo', 'Noto Kufi Arabic', 'sans-serif'],
        body: ['Noto Sans Arabic', 'Cairo', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: { glass: 'var(--shadow-glass)' },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};