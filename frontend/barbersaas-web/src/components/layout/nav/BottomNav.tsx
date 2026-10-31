import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { LogOut, MoreHorizontal } from 'lucide-react'
import { Drawer } from '../../ui/glass/Drawer'
import { Stagger, StaggerItem } from '../../motion/Stagger'
import { ICON, isActive, type NavGroup, type NavLeaf } from './navConfig'
import { IdentityBlock, type Identity } from './UserMenu'

interface BottomNavProps {
  primary: NavLeaf[]
  groups: NavGroup[]
  counts?: Record<string, number>
  identity: Identity
  onLogout: () => void
  /** Conteúdo extra no "Mais" (ex.: link público). */
  extra?: ReactNode
}

/**
 * Navegação mobile: barra de vidro flutuante no rodapé (4 atalhos + "Mais") com
 * indicador deslizante; "Mais" abre uma bottom sheet com o resto do menu,
 * agrupado. Respeita a safe-area do iPhone.
 */
export function BottomNav({ primary, groups, counts = {}, identity, onLogout, extra }: BottomNavProps) {
  const { pathname } = useLocation()
  const reduce = useReducedMotion()
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryTo = new Set(primary.map(p => p.to))
  const moreGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => !primaryTo.has(i.to)) }))
    .filter(g => g.items.length > 0)
  const activePrimary = primary.find(p => isActive(p.to, pathname))
  const moreActive = !activePrimary
  const moreCount = moreGroups.flatMap(g => g.items).reduce((n, i) => n + (isActive(i.to, pathname) ? 0 : counts[i.to] ?? 0), 0)

  const pill = (
    <motion.span layoutId="g-bn-pill" className="g-bn-pill" aria-hidden="true"
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 38 }} />
  )

  return (
    <>
      <LayoutGroup id="bottom-nav">
        <nav className="g-bottomnav lg:hidden" aria-label="Menu principal">
          {primary.map(({ to, label, icon: Icon }) => {
            const active = activePrimary?.to === to
            const count = !active ? counts[to] ?? 0 : 0
            return (
              <Link key={to} to={to} className="g-bn-item" aria-current={active ? 'page' : undefined}>
                {active && pill}
                <span className="g-bn-icon"><Icon {...ICON} />{count > 0 && <span className="g-side-icon-badge" aria-hidden="true" />}</span>
                <span className="g-bn-label">{label}</span>
              </Link>
            )
          })}
          <button type="button" className="g-bn-item" aria-current={moreActive ? 'page' : undefined}
            aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
            {moreActive && pill}
            <span className="g-bn-icon"><MoreHorizontal {...ICON} />{moreCount > 0 && <span className="g-side-icon-badge" aria-hidden="true" />}</span>
            <span className="g-bn-label">Mais</span>
          </button>
        </nav>
      </LayoutGroup>

      <Drawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} side="bottom" className="lg:hidden">
        <div className="g-sheet-handle" aria-hidden="true" />
        <Stagger className="space-y-6" stagger={0.04}>
          {moreGroups.map(g => (
            <StaggerItem key={g.label}>
              <p className="g-side-group g-side-group--static"><span>{g.label}</span></p>
              <div className="grid grid-cols-3 gap-2.5">
                {g.items.map(({ to, label, icon: Icon }) => {
                  const active = isActive(to, pathname)
                  const count = !active ? counts[to] ?? 0 : 0
                  return (
                    <Link key={to} to={to} className="g-sheet-tile" aria-current={active ? 'page' : undefined}
                      onClick={() => setMoreOpen(false)}>
                      <span className="relative"><Icon {...ICON} size={22} />{count > 0 && <span className="g-side-icon-badge" aria-hidden="true" />}</span>
                      <span className="g-sheet-tile-label">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </StaggerItem>
          ))}
          {extra && <StaggerItem>{extra}</StaggerItem>}
          <StaggerItem>
            <div className="g-sheet-account">
              <IdentityBlock id={identity} />
              <button type="button" className="g-menu-item g-menu-item--danger mt-3" onClick={() => { setMoreOpen(false); onLogout() }}>
                <LogOut {...ICON} size={18} /> Sair
              </button>
            </div>
          </StaggerItem>
        </Stagger>
      </Drawer>
    </>
  )
}
