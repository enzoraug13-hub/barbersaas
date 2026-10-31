import { useEffect, useRef, type RefObject } from 'react'

/**
 * Comportamento comum de Modal/Drawer enquanto abertos:
 * Esc fecha, trava o scroll do body, leva o foco pro painel e devolve o
 * foco ao elemento que abriu quando fecha.
 */
export function useOverlayBehavior(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foco no painel (não no 1º campo — não abre teclado no celular sem pedir).
    const t = window.setTimeout(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus({ preventScroll: true })
    }, 0)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.({ preventScroll: true })
    }
  }, [open, panelRef])
}
