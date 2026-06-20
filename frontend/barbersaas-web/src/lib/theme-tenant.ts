// Aplica as cores da barbearia (persistidas em TenantSettings) aos tokens do app,
// via CSS variables no <html>. A cor da marca (secondaryColor) vira o acento do app
// inteiro — botões, links, destaques — em painel e página pública.

function hexToRgb(hex?: string): [number, number, number] | null {
  if (!hex) return null
  const m = hex.replace('#', '').trim()
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const triplet = (rgb: [number, number, number]) => rgb.join(' ')

// Luminância relativa (0–1) para decidir texto preto/branco sobre o acento.
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

// Clareia (dark) ou escurece (light) o acento para o estado hover.
function shift([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const t = amount < 0 ? 0 : 255
  const a = Math.abs(amount)
  const m = (c: number) => Math.round(c + (t - c) * a)
  return [m(r), m(g), m(b)]
}

export interface TenantColors {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}

const toHex = ([r, g, b]: [number, number, number]) =>
  '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')

export function applyTenantTheme(c: TenantColors) {
  const root = document.documentElement
  const isLight = root.getAttribute('data-theme') === 'light'

  const brand = hexToRgb(c.secondaryColor)
  if (brand) {
    // Sistema antigo (Tailwind rgb(var(--x) / alpha)) — mantido para telas não migradas.
    root.style.setProperty('--accent', triplet(brand))
    // hover: escurece no tema claro, clareia no escuro
    root.style.setProperty('--accent-hover', triplet(shift(brand, isLight ? -0.12 : 0.15)))
    // contraste automático: texto preto sobre acentos claros, branco sobre escuros
    root.style.setProperty('--accent-fg', luminance(brand) > 0.5 ? '16 16 18' : '255 255 255')

    // Sistema novo (tokens.css) — hex puro, consumido direto via var(--tenant-primary).
    root.style.setProperty('--tenant-primary', toHex(brand))
    root.style.setProperty('--tenant-primary-hover', toHex(shift(brand, 0.15)))
    root.style.setProperty('--tenant-primary-soft', `rgba(${brand.join(',')},0.10)`)
  }

  // Cor do topo (capa) da página pública — exposta p/ quem quiser consumir.
  if (c.primaryColor) root.style.setProperty('--tenant-hero', c.primaryColor)
}

export function resetTenantTheme() {
  const root = document.documentElement
  ;['--accent', '--accent-hover', '--accent-fg', '--tenant-hero',
    '--tenant-primary', '--tenant-primary-hover', '--tenant-primary-soft']
    .forEach(v => root.style.removeProperty(v))
}
