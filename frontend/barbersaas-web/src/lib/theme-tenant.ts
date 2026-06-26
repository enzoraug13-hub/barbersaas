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
    const hex = toHex(brand)
    // hover: escurece no tema claro, clareia no escuro
    const hoverHex = toHex(shift(brand, isLight ? -0.12 : 0.15))

    // --accent é consumido DIRETO como cor (var(--accent)) em todo o app —
    // gráficos (recharts fill/stroke), abas ativas, botões, badges. Precisa
    // ser sempre um valor de cor CSS válido (hex), nunca um triplet RGB nu
    // (que só funcionaria dentro de rgb(var(--accent) / alpha), padrão que
    // este app não usa — escrever o triplet aqui quebrava tudo que lê
    // var(--accent) direto, deixando gráficos e abas pretos).
    root.style.setProperty('--accent', hex)
    root.style.setProperty('--accent-hover', hoverHex)
    root.style.setProperty('--accent-soft', `rgba(${brand.join(',')},0.10)`)
    root.style.setProperty('--accent-focus', `rgba(${brand.join(',')},0.25)`)
    // contraste automático: texto preto sobre acentos claros, branco sobre escuros
    root.style.setProperty('--accent-fg', luminance(brand) > 0.5 ? '#101012' : '#ffffff')

    // Alias do sistema novo (tokens.css) — mesmo valor, nome semântico.
    root.style.setProperty('--tenant-primary', hex)
    root.style.setProperty('--tenant-primary-hover', hoverHex)
    root.style.setProperty('--tenant-primary-soft', `rgba(${brand.join(',')},0.10)`)
  }

  // Cor do topo (capa) da página pública — exposta p/ quem quiser consumir.
  if (c.primaryColor) root.style.setProperty('--tenant-hero', c.primaryColor)
}

export function resetTenantTheme() {
  const root = document.documentElement
  ;['--accent', '--accent-hover', '--accent-soft', '--accent-focus', '--accent-fg', '--tenant-hero',
    '--tenant-primary', '--tenant-primary-hover', '--tenant-primary-soft']
    .forEach(v => root.style.removeProperty(v))
}
