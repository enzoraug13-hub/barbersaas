import { useReducedMotion, type Variants } from 'framer-motion'
import { DUR, EASE } from './tokens'

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.item, ease: EASE } },
}
const reducedItemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.reduced } },
}

/** Variantes de item de stagger (fade + y 16→0; só fade com movimento reduzido). */
export function useStaggerItemVariants(): Variants {
  const reduce = useReducedMotion()
  return reduce ? reducedItemVariants : itemVariants
}
