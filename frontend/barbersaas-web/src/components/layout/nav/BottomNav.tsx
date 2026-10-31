import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, MoreHorizontal } from 'lucide-react'
import { LiquidTabBar, type LiquidTab } from './LiquidTabBar'
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
 * Navegação mobile: tab bar "Liquid Glass" flutuante no rodapé (4 atalhos +
 * "Mais") — ver LiquidTabBar; "Mais" abre uma bottom sheet com o resto do menu,
 * agrupado. Respeita a safe-area do iPhone.
 */
export function BottomNav({ primary, groups, counts = {}, identity, onLogout, extra }: BottomNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryTo = new Set(primary.map(p => p.to))
  const moreGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => !primaryTo.has(i.to)) }))
    .filter(g => g.items.length > 0)
  const activePrimary = primary.find(p => isActive(p.to, pathname))
  const moreCount = moreGroups.flatMap(g => g.items).reduce((n, i) => n + (isActive(i.to, pathname) ? 0 : counts[i.to] ?? 0), 0)

  const tabs: LiquidTab[] = [
    ...primary.map(p => ({
      key: p.to, label: p.label, icon: p.icon, kind: 'route' as const,
      badge: activePrimary?.to !== p.to && (counts[p.to] ?? 0) > 0,
    })),
    { key: 'more', label: 'Mais', icon: MoreHorizontal, kind: 'action' as const, badge: moreCount > 0 },
  ]
  const activeIndex = activePrimary ? primary.indexOf(activePrimary) : primary.length

  return (
    <>
      {/* Conteúdo some num degradê atrás da barra (como no iOS) */}
      <div className="g-lg-fade lg:hidden" aria-hidden="true" />
      <nav className="g-lg-dock lg:hidden" aria-label="Menu principal">
        <LiquidTabBar items={tabs} activeIndex={activeIndex} aria-label="Menu principal"
          onSelect={i => (i < primary.length ? navigate(primary[i].to) : setMoreOpen(true))} />
      </nav>

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
