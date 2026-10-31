import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { PanelLeftClose, Pin, Scissors } from 'lucide-react'
import { DUR, EASE } from '../../motion/tokens'
import { ICON, isActive, type NavGroup } from './navConfig'

type Tip = { label: string; top: number; left: number } | null

interface SidebarProps {
  groups: NavGroup[]
  pinned: boolean
  onTogglePin: () => void
  /** Linhas do topo: nome da barbearia (ou identidade do Trimly). */
  brandSub?: string
  /** Contagens por rota (ex.: respostas de suporte não lidas). */
  counts?: Record<string, number>
  /** Rodapé: link público, usuário etc. */
  footer: ReactNode
}

/**
 * Sidebar flutuante de vidro (desktop). Recolhida = 76px (só ícones, com
 * tooltip); expandida = 248px. Fixada, empurra o conteúdo; solta, expande
 * por cima do conteúdo ao passar o mouse (sem mexer no layout).
 */
export function Sidebar({ groups, pinned, onTogglePin, brandSub, counts = {}, footer }: SidebarProps) {
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const [hoverOpen, setHoverOpen] = useState(false)
  const [tip, setTip] = useState<Tip>(null)
  const timer = useRef<number | undefined>(undefined)
  const expanded = pinned || hoverOpen

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Intenção de hover: passada rápida mostra só o tooltip; parar sobre o menu expande.
  const onEnter = () => {
    if (pinned) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { setHoverOpen(true); setTip(null) }, 500)
  }
  const onLeave = () => {
    window.clearTimeout(timer.current)
    setHoverOpen(false)
    setTip(null)
  }

  const showTip = (label: string) => (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    if (expanded) return
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ label, top: r.top + r.height / 2, left: r.right + 14 })
  }
  const hideTip = () => setTip(null)

  return (
    <>
      <aside
        className="g-side hidden lg:flex"
        data-expanded={expanded}
        data-overlay={!pinned && hoverOpen}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-label="Menu principal"
      >
        {/* Marca */}
        <div className="g-side-brand">
          <span className="g-brand-mark"><Scissors size={17} strokeWidth={2} /></span>
          <div className="g-side-label min-w-0">
            <p className="g-brand-name leading-tight">Trimly</p>
            {brandSub && <p className="g-side-sub truncate">{brandSub}</p>}
          </div>
        </div>

        {/* Navegação */}
        <LayoutGroup id="side-nav">
          <nav className="g-side-nav">
            {groups.map(group => (
              <div key={group.label} className="g-side-section">
                <p className="g-side-group"><span>{group.label}</span></p>
                {group.items.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to, pathname)
                  const count = !active ? (counts[to] ?? 0) : 0
                  return (
                    <Link
                      key={to}
                      to={to}
                      className="g-side-item"
                      aria-current={active ? 'page' : undefined}
                      aria-label={expanded ? undefined : label}
                      onMouseEnter={showTip(label)}
                      onMouseLeave={hideTip}
                      onFocus={showTip(label)}
                      onBlur={hideTip}
                    >
                      {active && (
                        <motion.span layoutId="g-side-pill" className="g-side-pill" aria-hidden="true"
                          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }} />
                      )}
                      <span className="g-side-icon">
                        <Icon {...ICON} />
                        {count > 0 && <span className="g-side-icon-badge" aria-hidden="true" />}
                      </span>
                      <span className="g-side-label">{label}</span>
                      {count > 0 && <span className="g-count g-side-label" aria-label={`${count} não lida(s)`}>{count > 9 ? '9+' : count}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </LayoutGroup>

        {/* Rodapé */}
        <div className="g-side-footer">
          {footer}
          <button type="button" className="g-side-item g-side-item--muted" onClick={onTogglePin}
            aria-pressed={pinned}
            aria-label={expanded ? undefined : (pinned ? 'Recolher menu' : 'Fixar menu')}
            onMouseEnter={showTip(pinned ? 'Recolher menu' : 'Fixar menu')} onMouseLeave={hideTip}>
            <span className="g-side-icon">{pinned ? <PanelLeftClose {...ICON} /> : <Pin {...ICON} />}</span>
            <span className="g-side-label">{pinned ? 'Recolher menu' : 'Fixar menu'}</span>
          </button>
        </div>
      </aside>

      {/* Tooltip de vidro (só recolhida) — em portal, fora do overflow da sidebar */}
      {createPortal(
        <AnimatePresence>
          {tip && !expanded && (
            <motion.div key={tip.label} className="g-tooltip" role="tooltip"
              style={{ top: tip.top, left: tip.left }}
              initial={{ opacity: 0, x: reduce ? 0 : -6, y: '-50%' }}
              animate={{ opacity: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, x: reduce ? 0 : -4, y: '-50%' }}
              transition={{ duration: DUR.micro, ease: EASE }}>
              {tip.label}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
