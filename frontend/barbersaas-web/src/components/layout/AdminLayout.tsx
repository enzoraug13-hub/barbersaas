import { useState, useEffect, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  House, CalendarDays, Users, Scissors, Tag, Wallet, Target, Package, Settings, LogOut,
  Building2, Receipt, Megaphone, LifeBuoy, MessagesSquare, Gift, Ellipsis, ExternalLink,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { isSuperAdmin } from '../../lib/roles'
import { api } from '../../lib/api'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { AnnouncementsBell } from '../admin/AnnouncementsBell'
import { useMySupportMessages } from '../../features/support/supportApi'
import { useLoyaltyProgram, useLoyaltyRedemptions } from '../../features/loyalty/loyaltyApi'
import { Logo, LogoMark } from '../ui/Logo'
import { Avatar } from '../ui/Avatar'
import { Modal } from '../ui/Modal'
import { Skeleton, LedgerSkeleton, ListSkeleton } from '../ui/Skeleton'

type NavLeaf = { to: string; label: string; icon: LucideIcon }
type NavGroup = { label: string | null; items: NavLeaf[] }

const home: NavLeaf      = { to: '/admin',            label: 'Início',            icon: House }
const agenda: NavLeaf    = { to: '/admin/agenda',     label: 'Agenda',            icon: CalendarDays }
const clients: NavLeaf   = { to: '/admin/clientes',   label: 'Clientes',          icon: Users }
const barbers: NavLeaf   = { to: '/admin/barbeiros',  label: 'Barbeiros',         icon: Scissors }
const services: NavLeaf  = { to: '/admin/servicos',   label: 'Serviços e preços', icon: Tag }
const products: NavLeaf  = { to: '/admin/produtos',   label: 'Produtos',          icon: Package }
const loyalty: NavLeaf   = { to: '/admin/fidelidade', label: 'Fidelidade',        icon: Gift }
const financial: NavLeaf = { to: '/admin/financeiro', label: 'Financeiro',        icon: Wallet }
const goals: NavLeaf     = { to: '/admin/metas',      label: 'Metas',             icon: Target }
const config: NavLeaf    = { to: '/admin/config',     label: 'Configurações',     icon: Settings }
const support: NavLeaf   = { to: '/admin/suporte',    label: 'Suporte',           icon: LifeBuoy }

const saAccounts: NavLeaf = { to: '/super-admin',           label: 'Barbearias', icon: Building2 }
const saInvoices: NavLeaf = { to: '/super-admin/faturas',   label: 'Faturas',    icon: Receipt }
const saNotices: NavLeaf  = { to: '/super-admin/avisos',    label: 'Avisos',     icon: Megaphone }
const saMessages: NavLeaf = { to: '/super-admin/mensagens', label: 'Mensagens',  icon: MessagesSquare }

// Menu da barbearia. Fidelidade só entra com o programa LIGADO.
function tenantGroups(loyaltyOn: boolean): NavGroup[] {
  return [
    { label: null, items: [home, agenda] },
    { label: 'Clientes e equipe', items: [clients, ...(loyaltyOn ? [loyalty] : []), barbers, services, products] },
    { label: 'Finanças', items: [financial, goals] },
    { label: 'Conta', items: [config, support] },
  ]
}

// Super admin é dono do Trimly, não de uma barbearia: só vê o que é do Trimly.
// (As rotas da barbearia continuam existindo se ele digitar a URL.)
const superAdminGroups: NavGroup[] = [{ label: null, items: [saAccounts, saInvoices, saNotices, saMessages] }]

// '/admin' e '/super-admin' casam só na rota exata (e o detalhe da conta); os demais também em sub-rotas.
const isActive = (to: string, pathname: string) =>
  to === '/admin' ? pathname === to
    : to === '/super-admin' ? pathname === to || pathname.startsWith('/super-admin/contas/')
    : pathname === to || pathname.startsWith(to + '/')

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const { user, logout } = useAuthStore()
  const superAdmin = isSuperAdmin(user?.role)
  const role = user?.role?.toLowerCase()
  const isOwner = role === 'owner'

  // Super admin não tem barbearia: não consulta /settings (responderia 403) e não
  // aplica tema de barbearia — o painel dele fica com a identidade do Trimly.
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
    staleTime: 5 * 60 * 1000,
    enabled: !superAdmin,
  })
  useEffect(() => { if (settings && !superAdmin) applyTenantTheme(settings) }, [settings, superAdmin])

  // Ponto de resposta não lida em "Suporte" (endpoint só do dono).
  const { data: supportMessages } = useMySupportMessages(isOwner)
  const supportUnread = supportMessages?.some(m => m.author === 'superadmin' && !m.readAt) ?? false

  // Fidelidade: decide se a aba aparece e conta os resgates a entregar.
  const canSeeLoyalty = !superAdmin && (role === 'owner' || role === 'admin')
  const { data: loyaltyProgram } = useLoyaltyProgram(canSeeLoyalty)
  const loyaltyOn = canSeeLoyalty && !!loyaltyProgram?.isEnabled
  const { data: redemptions } = useLoyaltyRedemptions(loyaltyOn)
  const pendingRedemptions = redemptions?.filter(r => r.status === 'Pending').length ?? 0

  const groups = superAdmin ? superAdminGroups : tenantGroups(loyaltyOn)
  const leaves = groups.flatMap(g => g.items)

  // Título da aba do navegador acompanha a seção.
  const current = leaves.filter(l => isActive(l.to, location.pathname)).sort((a, b) => b.to.length - a.to.length)[0]
  useEffect(() => { document.title = current ? `${current.label} | Trimly` : 'Trimly' }, [current])

  const handleLogout = () => { logout(); navigate('/login') }

  const businessName: string = settings?.businessName || 'Minha barbearia'
  const publicUrl = settings?.publicSlug ? `/b/${settings.publicSlug}` : null

  // Indicador ao lado do item (resgates a entregar / resposta não lida).
  const trailing = (to: string) => {
    if (to === loyalty.to && pendingRedemptions > 0)
      return <span className="side-count" aria-label={`${pendingRedemptions} resgate(s) a entregar`}>{pendingRedemptions > 9 ? '9+' : pendingRedemptions}</span>
    if (to === support.to && supportUnread) return <span className="side-dot" aria-label="Resposta não lida" />
    return null
  }

  // ---------- Navegação inferior (mobile) ----------
  const tabs: NavLeaf[] = superAdmin ? [saAccounts, saInvoices, saNotices, saMessages] : [home, agenda, clients, financial]
  const overflow = leaves.filter(l => !tabs.includes(l))
  const overflowActive = overflow.some(l => isActive(l.to, location.pathname))
  const overflowAlert = supportUnread || pendingRedemptions > 0

  return (
    <div className="app-shell">
      {desktop && (
        <aside className="side" aria-label="Menu principal">
          <div className="side-head">
            <Link to={superAdmin ? '/super-admin' : '/admin'} aria-label="Trimly, início"><Logo size={30} /></Link>
            <AnnouncementsBell enabled={isOwner} loyaltyEnabled={loyaltyOn} align="left" />
          </div>

          <div className="side-workspace">
            {superAdmin
              ? <span className="ds-avatar" style={{ width: 36, height: 36, background: 'var(--surface-3)', color: 'var(--ink-2)' }}><Building2 size={17} /></span>
              : <Avatar name={businessName} src={settings?.logoUrl} size={36} />}
            <div className="min-w-0">
              <p className="side-workspace-name">{superAdmin ? 'Administração' : businessName}</p>
              {superAdmin
                ? <p className="side-workspace-sub">Todas as barbearias</p>
                : publicUrl
                  ? <a className="side-workspace-sub" href={publicUrl} target="_blank" rel="noopener noreferrer">Página de agendamento <ExternalLink size={11} /></a>
                  : <p className="side-workspace-sub">Barbearia</p>}
            </div>
          </div>

          <nav className="side-nav">
            {groups.map(group => (
              <div key={group.label ?? 'root'} className="side-group">
                {group.label && <p className="side-label">{group.label}</p>}
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <Link key={item.to} to={item.to} className="side-item"
                      aria-current={isActive(item.to, location.pathname) ? 'page' : undefined}>
                      <Icon size={18} strokeWidth={1.75} />
                      {item.label}
                      {trailing(item.to)}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="side-foot">
            <Avatar name={user?.name} size={32} />
            <div className="flex-1 min-w-0">
              <p className="side-user-name">{superAdmin ? 'Super admin' : user?.name}</p>
              <p className="side-user-mail">{user?.email}</p>
            </div>
            <button type="button" onClick={handleLogout} className="side-icon-btn" aria-label="Sair" title="Sair">
              <LogOut size={17} strokeWidth={1.75} />
            </button>
          </div>
        </aside>
      )}

      <div className="app-main">
        {!desktop && (
          <header className="mbar">
            <LogoMark size={30} />
            <p className="mbar-title">{superAdmin ? 'Trimly' : businessName}</p>
            <AnnouncementsBell enabled={isOwner} loyaltyEnabled={loyaltyOn} align="right" />
          </header>
        )}

        <main className="app-content">
          {/* Telas do painel chegam em pedaços (lazy): o menu fica e só o miolo carrega. */}
          <Suspense fallback={<PageLoading />}>{children}</Suspense>
        </main>

        {!desktop && (
          <nav className="tabbar" aria-label="Navegação">
            {tabs.map(t => {
              const Icon = t.icon
              const active = isActive(t.to, location.pathname)
              return (
                <Link key={t.to} to={t.to} className="tabbar-item" aria-current={active ? 'page' : undefined}>
                  <Icon size={22} strokeWidth={active ? 2 : 1.75} />
                  {t.label}
                </Link>
              )
            })}
            <button type="button" className="tabbar-item" onClick={() => setMoreOpen(true)}
              aria-current={overflowActive ? 'page' : undefined} aria-haspopup="dialog">
              <Ellipsis size={22} strokeWidth={overflowActive ? 2 : 1.75} />
              Mais
              {overflowAlert && <span className="tabbar-badge" aria-label="Há itens pendentes" />}
            </button>
          </nav>
        )}
      </div>

      <Modal isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Mais opções">
        {overflow.length > 0 && (
          <div className="mb-4">
            {overflow.map(l => {
              const Icon = l.icon
              return (
                <Link key={l.to} to={l.to} className="more-item" onClick={() => setMoreOpen(false)}
                  aria-current={isActive(l.to, location.pathname) ? 'page' : undefined}>
                  <Icon size={20} strokeWidth={1.75} />
                  <span className="flex-1">{l.label}</span>
                  {trailing(l.to)}
                </Link>
              )
            })}
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="more-item" onClick={() => setMoreOpen(false)}>
                <ExternalLink size={20} strokeWidth={1.75} />
                <span className="flex-1">Página de agendamento</span>
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-3 rounded-control bg-surface-2 border border-line p-3">
          <Avatar name={user?.name} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{superAdmin ? 'Super admin' : user?.name}</p>
            <p className="text-13 text-ink-2 truncate">{user?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="ds-btn ds-btn-secondary ds-btn-sm">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* Enquanto o pedaço da tela carrega: o mesmo formato de cabeçalho + conteúdo. */
function PageLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-48" />
      <LedgerSkeleton cells={3} />
      <ListSkeleton rows={4} />
    </div>
  )
}
