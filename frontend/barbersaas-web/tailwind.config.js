/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens semânticos (definidos em index.css; trocam com o tema light/dark)
        app:          withAlpha('--bg'),
        surface:      withAlpha('--surface'),
        surfaceHover: withAlpha('--surface-hover'),
        border:       withAlpha('--border'),
        content:      withAlpha('--text'),
        muted:        withAlpha('--text-muted'),
        subtle:       withAlpha('--text-subtle'),
        accent:       withAlpha('--accent'),
        accentHover:  withAlpha('--accent-hover'),
        accentFg:     withAlpha('--accent-fg'),
        success:      withAlpha('--success'),
        warning:      withAlpha('--warning'),
        danger:       withAlpha('--danger'),
        info:         withAlpha('--info'),
        // Cores por barbearia (página pública)
        primary:   'var(--color-primary)',
        secondary: 'var(--color-secondary)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm:   '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        DEFAULT: '0 2px 8px -2px rgb(0 0 0 / 0.10), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
        md:   '0 4px 16px -4px rgb(0 0 0 / 0.12), 0 8px 28px -6px rgb(0 0 0 / 0.10)',
        lg:   '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 20px 48px -12px rgb(0 0 0 / 0.14)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.20), 0 8px 24px -6px rgb(var(--accent) / 0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        // 'both' = mantém o estado inicial durante o delay (stagger sem flicker)
        'fade-in': 'fade-in 0.18s ease-out both',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-up': 'slide-up 0.26s ease-out both',
      },
    },
  },
  plugins: [],
}
