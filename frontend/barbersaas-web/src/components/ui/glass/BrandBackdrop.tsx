import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from '../../motion/tokens'

// Traços da marca Trimly (tesoura) — mesmos do favicon e da sidebar.
const MARK_PATHS = [
  { type: 'circle', cx: 6, cy: 6, r: 3 },
  { type: 'path', d: 'M8.12 8.12 12 12' },
  { type: 'path', d: 'M20 4 8.12 15.88' },
  { type: 'circle', cx: 6, cy: 18, r: 3 },
  { type: 'path', d: 'M14.8 14.8 20 20' },
] as const

/**
 * Fundo com a cara da marca (telas de login): aurora dourada do Trimly atrás
 * do cartão, listras finas em diagonal (poste de barbearia) que somem nas
 * bordas e a tesoura gigante em traço fino que se desenha uma vez na entrada.
 * Depois fica estático (o cartão de vidro não recalcula blur a cada frame).
 */
export function BrandBackdrop() {
  const reduce = useReducedMotion()
  return (
    <div className="g-brand-bg" aria-hidden="true">
      <motion.div className="g-brand-glow g-brand-glow--main"
        initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0.15 : 1.4, ease: EASE }} />
      <div className="g-brand-glow g-brand-glow--bronze" />
      <div className="g-brand-glow g-brand-glow--cool" />
      <div className="g-brand-stripes" />

      <svg className="g-brand-mark-xl" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="g-brand-stroke" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E9CF86" />
            <stop offset="55%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#8A6A24" />
          </linearGradient>
        </defs>
        {MARK_PATHS.map((p, i) => {
          const common = {
            stroke: 'url(#g-brand-stroke)', strokeWidth: 0.11, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
            initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : 1 },
            animate: { pathLength: 1, opacity: 1 },
            transition: reduce ? { duration: 0.15 } : { duration: 1.6, ease: EASE, delay: 0.35 + i * 0.14 },
          }
          return p.type === 'circle'
            ? <motion.circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />
            : <motion.path key={i} d={p.d} {...common} />
        })}
      </svg>

      <div className="g-ambient-grain" />
      <div className="g-brand-vignette" />
    </div>
  )
}
