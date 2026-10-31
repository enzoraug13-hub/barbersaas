import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronsUpDown, LogOut } from 'lucide-react'
import { DUR, EASE } from '../../motion/tokens'
import { ICON } from './navConfig'

export interface Identity {
  /** Linha principal (nome da barbearia, ou "Trimly" pro super admin). */
  title: string
  /** Linha secundária (nome do usuário, ou "Super admin"). */
  subtitle?: string
  email?: string
  avatar: ReactNode
}

/** Avatar redondo com a inicial/ícone, borda dourada. */
export function Avatar({ children, size = 36 }: { children: ReactNode; size?: number }) {
  return (
    <span className="g-avatar g-avatar--accent" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {children}
    </span>
  )
}

/** Bloco de identidade (usado no popover e na sheet "Mais" do mobile). */
export function IdentityBlock({ id }: { id: Identity }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar size={40}>{id.avatar}</Avatar>
      <div className="min-w-0">
        <p className="g-fg-1 font-semibold text-sm truncate">{id.title}</p>
        {id.subtitle && <p className="g-fg-2 text-xs truncate capitalize">{id.subtitle}</p>}
        {id.email && <p className="g-fg-3 text-xs truncate">{id.email}</p>}
      </div>
    </div>
  )
}

/**
 * Linha do usuário no rodapé da sidebar: avatar + nome + menu (identidade e
 * Sair) em popover de vidro ao lado. Recolhida, só o avatar fica visível.
 */
export function UserMenu({ id, onLogout }: { id: Identity; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, bottom: 0 })
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  const toggle = () => {
    const r = btn.current?.getBoundingClientRect()
    if (r) setPos({ left: r.right + 14, bottom: window.innerHeight - r.bottom })
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !btn.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      <button ref={btn} type="button" className="g-side-user" onClick={toggle}
        aria-haspopup="menu" aria-expanded={open} aria-label={`${id.title} — menu da conta`}>
        <Avatar>{id.avatar}</Avatar>
        <span className="g-side-label min-w-0 flex-1 text-left">
          <span className="block g-fg-1 text-[13px] font-semibold truncate">{id.title}</span>
          {id.subtitle && <span className="block g-fg-3 text-[12px] truncate capitalize">{id.subtitle}</span>}
        </span>
        <ChevronsUpDown size={16} strokeWidth={1.75} className="g-side-label g-fg-3 flex-shrink-0" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div ref={panel} role="menu" className="g-popover g-user-pop"
              style={{ left: pos.left, bottom: pos.bottom }}
              initial={{ opacity: 0, x: reduce ? 0 : -8, scale: reduce ? 1 : 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduce ? 0 : -6, scale: reduce ? 1 : 0.98 }}
              transition={{ duration: DUR.base, ease: EASE }}>
              <div className="p-4"><IdentityBlock id={id} /></div>
              <div className="border-t g-divider p-1.5">
                <button type="button" role="menuitem" className="g-menu-item g-menu-item--danger"
                  onClick={() => { setOpen(false); onLogout() }}>
                  <LogOut {...ICON} size={18} /> Sair
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
