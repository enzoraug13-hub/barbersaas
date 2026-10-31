import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DUR, EASE } from '../../motion/tokens'

interface PeriodPillProps {
  /** Rótulo do período atual (ex.: "outubro de 2026"). */
  label: string
  onPrev: () => void
  onNext: () => void
  canPrev?: boolean
  canNext?: boolean
  /** Direção da última troca (-1 = voltou, 1 = avançou) — o rótulo desliza nesse sentido. */
  direction?: number
}

/** Seletor de período em pílula de vidro: ‹ rótulo ›. */
export function PeriodPill({ label, onPrev, onNext, canPrev = true, canNext = true, direction = 0 }: PeriodPillProps) {
  const reduce = useReducedMotion()
  const dx = reduce ? 0 : 14 * (direction || 1)
  return (
    <div className="g-period" role="group" aria-label="Período">
      <button type="button" className="g-period-btn" onClick={onPrev} disabled={!canPrev} aria-label="Período anterior">
        <ChevronLeft size={16} strokeWidth={2} />
      </button>
      <div className="g-period-label" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false} custom={dx}>
          <motion.span
            key={label}
            className="block"
            custom={dx}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d, filter: reduce ? 'none' : 'blur(4px)' }),
              center: { opacity: 1, x: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
              exit: (d: number) => ({ opacity: 0, x: -d, filter: reduce ? 'none' : 'blur(4px)' }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduce ? DUR.reduced : DUR.base, ease: EASE }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <button type="button" className="g-period-btn" onClick={onNext} disabled={!canNext} aria-label="Próximo período">
        <ChevronRight size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
