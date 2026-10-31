import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from '../../motion/tokens'
import { TRIMLY_T } from './trimlyMarkPaths'

// Contornos da marca Trimly ("T de corte"): barra, haste em lâmina e o corte diagonal.
const MARK_PATHS = [TRIMLY_T.bar, TRIMLY_T.stem, TRIMLY_T.slice]

/**
 * Fundo com a cara da marca (telas de login): aurora dourada do Trimly atrás
 * do cartão, listras finas em diagonal (poste de barbearia) que somem nas
 * bordas e a marca (T de corte) gigante em traço fino que se desenha uma vez na entrada.
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

      <svg className="g-brand-mark-xl" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="g-brand-stroke" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F4DC97" />
            <stop offset="55%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#8A6A24" />
          </linearGradient>
        </defs>
        {MARK_PATHS.map((d, i) => (
          <motion.path key={i} d={d}
            stroke="url(#g-brand-stroke)" strokeWidth={0.2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={reduce ? { duration: 0.15 } : { duration: 1.6, ease: EASE, delay: 0.35 + i * 0.2 }} />
        ))}
      </svg>

      <div className="g-ambient-grain" />
      <div className="g-brand-vignette" />
    </div>
  )
}
