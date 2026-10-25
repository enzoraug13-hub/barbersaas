import { useSyncExternalStore } from 'react'

/** Assina uma media query (re-renderiza quando ela muda). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    cb => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Layout de desktop (barra lateral, grade da agenda, tabelas largas). */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
