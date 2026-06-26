/** @type {import('tailwindcss').Config} */

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens do design system novo (src/styles/tokens.css). Os nomes ficam
        // diferentes do nome do token CSS (ex.: "app" em vez de "bgBase") porque
        // Tailwind gera a classe como {utility}-{key} — usar a mesma palavra em
        // bg/text/border (ex. "subtle") faria todas apontarem pro mesmo valor,
        // mas --bg-subtle e --border-subtle são cores diferentes. Quem consome
        // os tokens direto via var(--bg-base) etc. (a maioria do app) não é
        // afetado; isto é só para as classes Tailwind ainda em uso (StyleGuidePage).
        app:          'var(--bg-base)',
        surface:      'var(--bg-subtle)',
        surfaceHover: 'var(--bg-elevated)',
        border:       'var(--border-subtle)',
        content:      'var(--text-primary)',
        muted:        'var(--text-secondary)',
        subtle:       'var(--text-disabled)',
        accent:       'var(--accent)',
        accentHover:  'var(--accent-hover)',
        accentFg:     'var(--bg-base)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm:   '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        DEFAULT: '0 2px 8px -2px rgb(0 0 0 / 0.10), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
        md:   '0 4px 16px -4px rgb(0 0 0 / 0.12), 0 8px 28px -6px rgb(0 0 0 / 0.10)',
        lg:   '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 20px 48px -12px rgb(0 0 0 / 0.14)',
        glow: '0 0 0 1px var(--accent-focus), 0 8px 24px -6px var(--accent-focus)',
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
