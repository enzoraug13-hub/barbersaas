// Aplica a cor da barbearia (TenantSettings.secondaryColor) aos tokens do app via
// CSS variables no <html>. A cor vira o --accent: botões principais, item ativo do
// menu, marcação de "hoje/agora" e seleção — no painel e na página pública.
//
// Como qualquer cor pode chegar (o dono escolhe livremente), os derivados são
// calculados por contraste real (WCAG), não por um limiar fixo:
//  --accent-fg   texto sobre o botão: preto ou branco, o que contrastar mais
//  --accent-ink  versão da cor legível como texto/borda sobre branco (≥ 4.5:1)
//  --accent-soft fundo de seleção (tinta clara da cor)

type RGB = [number, number, number]

const INK: RGB = [21, 24, 28]          // --ink
const WHITE: RGB = [255, 255, 255]

function hexToRgb(hex?: string): RGB | null {
  if (!hex) return null
  const m = hex.replace('#', '').trim()
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

const toHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map(c => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Mistura com preto (t > 0) — usado p/ hover e p/ a versão "tinta" legível.
const darken = ([r, g, b]: RGB, t: number): RGB => [r * (1 - t), g * (1 - t), b * (1 - t)]

/** Texto legível sobre a cor: o que der mais contraste entre grafite e branco. */
export function foregroundFor(hex?: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return toHex(INK)
  return contrast(rgb, WHITE) >= contrast(rgb, INK) ? '#FFFFFF' : toHex(INK)
}

/** Versão da cor que passa 4.5:1 sobre branco (escurece até chegar lá). */
function inkVersion(rgb: RGB): RGB {
  let t = 0
  let c = rgb
  while (contrast(c, WHITE) < 4.6 && t < 0.92) {
    t += 0.02
    c = darken(rgb, t)
  }
  return c
}

// Cores que vieram de padrões antigos do sistema (não de escolha do dono):
// o dourado padrão do banco/seed e o quase-preto do topo. Quem nunca trocou
// passa a usar a identidade atual do Trimly (azul-petróleo).
const LEGACY_BRAND = new Set(['#c9a84c', '#eab308', '#d4af37'])
const LEGACY_HERO = new Set(['#1a1a1a', '#1a1410'])
export const DEFAULT_BRAND = '#0F4C5C'
export const DEFAULT_HERO = '#0B3A46'

/** Cor da marca efetiva do tenant (padrões antigos → padrão atual). */
export const effectiveBrand = (hex?: string) =>
  !hex || LEGACY_BRAND.has(hex.trim().toLowerCase()) ? DEFAULT_BRAND : hex

/** Cor do topo efetiva: padrão antigo → versão escura da cor da marca. */
export function effectiveHero(hero?: string, brand?: string) {
  if (hero && !LEGACY_HERO.has(hero.trim().toLowerCase()) && hexToRgb(hero)) return hero
  const b = hexToRgb(effectiveBrand(brand))
  return b ? toHex(darken(b, 0.24)) : DEFAULT_HERO
}

export interface TenantColors {
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}

export function applyTenantTheme(c: TenantColors) {
  const root = document.documentElement
  const brandHex = effectiveBrand(c.secondaryColor)
  const brand = hexToRgb(brandHex)

  if (brand) {
    const [r, g, b] = brand
    root.style.setProperty('--accent', toHex(brand))
    root.style.setProperty('--accent-hover', toHex(darken(brand, 0.08)))
    root.style.setProperty('--accent-fg', foregroundFor(brandHex))
    root.style.setProperty('--accent-ink', toHex(inkVersion(brand)))
    root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.10)`)
    root.style.setProperty('--accent-line', `rgba(${r},${g},${b},0.38)`)
  }

  // Cor do topo da página pública (fundo do cabeçalho quando não há foto de capa).
  root.style.setProperty('--hero', effectiveHero(c.primaryColor, c.secondaryColor))
}

export function resetTenantTheme() {
  const root = document.documentElement
  ;['--accent', '--accent-hover', '--accent-fg', '--accent-ink', '--accent-soft', '--accent-line', '--hero']
    .forEach(v => root.style.removeProperty(v))
}
