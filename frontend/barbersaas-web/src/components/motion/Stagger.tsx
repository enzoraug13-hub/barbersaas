import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { STAGGER } from './tokens'
import { useStaggerItemVariants } from './variants'

type StaggerProps = HTMLMotionProps<'div'> & {
  /** Intervalo entre filhos (s). Padrão 0.05. */
  stagger?: number
  /** Atraso antes do primeiro filho (s). */
  delay?: number
}

/**
 * Container que revela os <StaggerItem> filhos em sequência (fade + y 16→0).
 * Roda uma vez por montagem — re-renders não reanimam.
 */
export function Stagger({ stagger = STAGGER, delay = 0, children, ...rest }: StaggerProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Filho de <Stagger>. Herda o estado do pai; não anima sozinho. */
export function StaggerItem({ children, ...rest }: HTMLMotionProps<'div'>) {
  const variants = useStaggerItemVariants()
  return (
    <motion.div variants={variants} {...rest}>
      {children}
    </motion.div>
  )
}
