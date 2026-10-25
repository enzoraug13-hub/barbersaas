import { BRAND, MARK_T, MARK_CUT, WORD_VIEWBOX, WORD_RATIO, WORD_LETTERS, WORD_DOT } from './logoPaths'

/* Marca do Trimly — identidade do produto, não muda com a cor da barbearia. */

/** Símbolo: o "t" com o corte diagonal, no quadrado azul-petróleo. */
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      <rect width="48" height="48" rx="11" fill={BRAND.petrol} />
      <path fill="#FFFFFF" d={MARK_T} />
      <path fill={BRAND.petrol} d={MARK_CUT} />
    </svg>
  )
}

/** Logotipo "trimly". `inverse` para fundo escuro. */
export function Wordmark({ height = 20, inverse = false, className = '' }: { height?: number; inverse?: boolean; className?: string }) {
  return (
    <svg height={height} width={Math.round(height * WORD_RATIO)} viewBox={WORD_VIEWBOX} className={`flex-shrink-0 ${className}`}
      role="img" aria-label="Trimly">
      <path fill={inverse ? '#FFFFFF' : BRAND.ink} d={WORD_LETTERS} />
      <path fill={inverse ? BRAND.aqua : BRAND.petrol} d={WORD_DOT} />
    </svg>
  )
}

/** Símbolo + logotipo. */
export function Logo({ size = 32, inverse = false, className = '' }: { size?: number; inverse?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: Math.round(size * 0.3) }}>
      <LogoMark size={size} />
      <Wordmark height={Math.round(size * 0.78)} inverse={inverse} />
    </span>
  )
}
