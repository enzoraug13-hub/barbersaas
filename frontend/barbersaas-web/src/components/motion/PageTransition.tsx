import { useContext, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Variants } from 'framer-motion'
import { UNSAFE_LocationContext, UNSAFE_RouteContext, useLocation } from 'react-router-dom'
import { DUR, EASE } from './tokens'

const pageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(8px)' },
  enter: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: DUR.page, ease: EASE },
    // Sem filtro residual: qualquer filter/transform ≠ none vira "containing
    // block" e prenderia os modais position:fixed legados dentro da página.
    transitionEnd: { filter: 'none' },
  },
  exit: {
    opacity: 0, y: -8, filter: 'blur(8px)',
    transition: { duration: DUR.pageExit, ease: EASE },
  },
}

// prefers-reduced-motion: sem blur e sem deslocamento — só um fade curto.
const reducedVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: DUR.reduced } },
  exit: { opacity: 0, transition: { duration: DUR.reduced } },
}

/**
 * Troca de página animada (AnimatePresence mode="wait", key = rota).
 * Saída: opacity 0 + blur(8px) + y −8. Entrada: de opacity 0 + blur(8px) + y 12.
 */
export function PageTransition({ children, onExitComplete }: { children: ReactNode; onExitComplete?: () => void }) {
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      <motion.div
        key={pathname}
        variants={reduce ? reducedVariants : pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <FreezeRouterWhileExiting>{children}</FreezeRouterWhileExiting>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Enquanto a página antiga faz a animação de saída, o router já está na rota
 * nova — sem isto, useParams/useSearchParams da página que sai leriam os
 * valores da rota de destino (ex.: id vazio) e ela re-renderizaria num estado
 * errado durante o fade. Aqui a página que sai continua vendo a rota dela.
 * Enquanto presente, repassa o contexto vivo (nada muda no comportamento).
 */
function FreezeRouterWhileExiting({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent()
  const location = useContext(UNSAFE_LocationContext)
  const route = useContext(UNSAFE_RouteContext)
  const [snapshot, setSnapshot] = useState({ location, route })
  if (isPresent && (snapshot.location !== location || snapshot.route !== route)) {
    setSnapshot({ location, route })
  }
  const value = isPresent ? { location, route } : snapshot
  return (
    <UNSAFE_LocationContext.Provider value={value.location}>
      <UNSAFE_RouteContext.Provider value={value.route}>
        {children}
      </UNSAFE_RouteContext.Provider>
    </UNSAFE_LocationContext.Provider>
  )
}
