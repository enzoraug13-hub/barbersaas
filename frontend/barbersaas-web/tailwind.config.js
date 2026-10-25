/** @type {import('tailwindcss').Config} */

// As cores apontam para os tokens de src/styles/tokens.css — a cor da barbearia
// (accent*) é trocada em runtime por applyTenantTheme(), então nenhuma tela usa
// hex fixo. Sem modificador de opacidade (/50) nas cores de token: use os tons
// prontos (accent-soft, ok-soft…).
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-soft': 'var(--accent-soft)',
        'accent-fg': 'var(--accent-fg)',
        ok: 'var(--ok)',
        'ok-solid': 'var(--ok-solid)',
        'ok-soft': 'var(--ok-soft)',
        warn: 'var(--warn)',
        'warn-soft': 'var(--warn-soft)',
        bad: 'var(--bad)',
        'bad-soft': 'var(--bad-soft)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)',
      },
      fontFamily: {
        sans: ['var(--font)'],
      },
      fontSize: {
        '2xs': ['11px', '14px'],
        xs: ['12px', '16px'],
        '13': ['13px', '18px'],
        sm: ['14px', '20px'],
        md: ['15px', '22px'],
      },
      borderRadius: {
        control: 'var(--r-control)',
        panel: 'var(--r-panel)',
        dialog: 'var(--r-dialog)',
      },
    },
  },
  plugins: [],
}
