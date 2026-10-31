import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE } from '../../motion/tokens'
import { cx } from './cx'

interface ProgressProps {
  /** 0–100 */
  value: number
  className?: string
  /** Atraso da animação (s) — útil em listas. */
  delay?: number
  'aria-label'?: string
}

/**
 * Barra de progresso que enche ao entrar na tela. Anima só transform
 * (translateX do preenchimento dentro de um trilho com overflow hidden),
 * então as pontas arredondadas não distorcem.
 */
export function Progress({ value, className, delay = 0, ...aria }: ProgressProps) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className={cx('g-progress', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(pct)} {...aria}>
      <motion.div
        className="g-progress-fill"
        initial={reduce ? { opacity: 0, x: `${pct - 100}%` } : { x: '-100%' }}
        whileInView={{ opacity: 1, x: `${pct - 100}%` }}
        viewport={{ once: true }}
        transition={reduce ? { duration: DUR.reduced } : { duration: DUR.chart, ease: EASE, delay }}
      />
    </div>
  )
}
