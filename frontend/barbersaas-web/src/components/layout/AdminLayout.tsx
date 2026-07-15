import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, UsersRound, Scissors, Tag, DollarSign,
  Target, Package, Settings, LogOut, Menu, X, ChevronRight, ChevronDown, ShieldCheck, Receipt, Megaphone,
  LifeBuoy, MessagesSquare
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { isSuperAdmin } from '../../lib/roles'
import { api } from '../../lib/api'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { AnnouncementsBell } from '../admin/AnnouncementsBell'
import { useMySupportMessages } from '../../features/support/supportApi'

// Um item de navegação é uma folha (link direto) ou um pai com filhos
// (grupo expansível). Os destinos dos filhos são telas que já existem.
type NavLeaf = { to: string; label: string; icon: LucideIcon }
type NavParent = { label: string; icon: LucideIcon; children: NavLeaf[] }
type NavEntry = NavLeaf | NavParent
const isParent = (e: NavEntry): e is NavParent => 'children' in e

const navGroups: { label: string | null; items: NavEntry[] }[] = [
  { label: null, items: [
    { to: '/admin',          label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/agenda',   label: 'Agenda',     icon: Calendar },
  ] },
  { label: 'Gestão', items: [
    { to: '/admin/clientes',  label: 'Clientes',  icon: Users },
    { label: 'Equipe', icon: UsersRound, children: [
      { to: '/admin/barbeiros', label: 'Barbeiros',        icon: Scissors },
      { to: '/admin/servicos',  label: 'Serviços & Preços', icon: Tag },
    ] },
    { to: '/admin/produtos',  label: 'Produtos',  icon: Package },
  ] },
  { label: 'Financeiro', items: [
    { to: '/admin/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/admin/metas',      label: 'Metas',       icon: Target },
  ] },
  { label: 'Sistema', items: [
    { to: '/admin/config',  label: 'Configurações', icon: Settings },
    { to: '/admin/suporte', label: 'Suporte',        icon: LifeBuoy },
  ] },
]

// Entradas do super admin (dono do Trimly).
const superAdminLeaf: NavLeaf = { to: '/super-admin', label: 'Contas', icon: ShieldCheck }
const superAdminInvoicesLeaf: NavLeaf = { to: '/super-admin/faturas', label: 'Faturas', icon: Receipt }
const superAdminAnnouncementsLeaf: NavLeaf = { to: '/super-admin/avisos', label: 'Avisos', icon: Megaphone }
const superAdminSupportLeaf: NavLeaf = { to: '/super-admin/mensagens', label: 'Mensagens', icon: MessagesSquare }

// Menu do super admin: só o que é do Trimly. Os itens de operação de UMA barbearia
// (agenda, clientes, equipe, produtos, financeiro, metas, configurações) somem — ele
// não opera barbearia nenhuma. É só UI: as rotas continuam existindo e funcionando
// se ele digitar a URL.
const superAdminGroups: { label: string | null; items: NavEntry[] }[] = [
  { label: 'Trimly', items: [superAdminLeaf, superAdminInvoicesLeaf, superAdminAnnouncementsLeaf, superAdminSupportLeaf] },
]

// Todas as folhas (achatando os submenus) — usado pra resolver o título da topbar.
const allLeaves: NavLeaf[] = [
  ...navGroups.flatMap(g => g.items.flatMap(i => (isParent(i) ? i.children : [i]))),
  superAdminLeaf, superAdminInvoicesLeaf, superAdminAnnouncementsLeaf, superAdminSupportLeaf,
]

// '/admin' casa só na rota exata; os demais casam também em sub-rotas
// (ex.: '/admin/barbeiros/:id' destaca "Barbeiros").
const isActive = (to: string, pathname: string) =>
  to === '/admin' ? pathname === '/admin' : pathname === to || pathname.startsWith(to + '/')

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()

  // Abre automaticamente o submenu que contém a rota atual (sem fechar os que
  // o usuário abriu manualmente). Não força fechamento.
  useEffect(() => {
    navGroups.forEach(g => g.items.forEach(item => {
      if (isParent(item) && item.children.some(c => isActive(c.to, location.pathname))) {
        setOpenGroups(prev => (prev.has(item.label) ? prev : new Set(prev).add(item.label)))
      }
    }))
  }, [location.pathname])

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label); else next.add(label)
      return next
    })

  const pageTitle = allLeaves
    .filter(l => isActive(l.to, location.pathname))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Painel'

  // Super admin não tem barbearia: não consulta /settings (o endpoint é de
  // barbearia e responderia 403 — ele não pertence a tenant nenhum) e não aplica
  // tema de tenant — o painel dele fica com a identidade padrão do Trimly.
  const superAdmin = isSuperAdmin(user?.role)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
    staleTime: 5 * 60 * 1000,
    enabled: !superAdmin,
  })
  useEffect(() => { if (settings && !superAdmin) applyTenantTheme(settings) }, [settings, superAdmin])

  const handleLogout = () => { logout(); navigate('/login') }

  // Pontinho de resposta não-lida no item "Suporte" — mesmo espírito do sino de
  // avisos: só consulta quando o usuário é Owner (o endpoint é RequireOwner;
  // barber/admin levariam 403). Some quando a página é aberta (ela marca como lido).
  const isOwner = user?.role?.toLowerCase() === 'owner'
  const { data: supportMessages } = useMySupportMessages(isOwner)
  const supportUnread = supportMessages?.some(m => m.author === 'superadmin' && !m.readAt) ?? false

  // Super admin vê só o menu do Trimly; todos os demais veem o menu da barbearia
  // exatamente como antes.
  const groups = superAdmin ? superAdminGroups : navGroups

  return (
    // h-dvh (viewport dinâmico) no lugar de 100vh: no iOS Safari o 100vh inclui a
    // área atrás da barra de endereço, o documento fica rolável e o header (com o
    // botão ☰) some ao rolar. h-screen permanece como fallback pra navegadores
    // sem suporte a dvh. No desktop dvh === vh — nada muda.
    <div className="flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`ds-sidebar fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="ds-sidebar-logo flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="ds-sidebar-logo-mark w-8 h-8 rounded-lg flex items-center justify-center">
              <Scissors size={16} style={{ color: 'var(--accent-fg)' }} />
            </div>
            <span className="ds-sidebar-logo-text">Trimly</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ds-icon-btn lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map((group, gi) => (
            <div key={group.label ?? 'root'}>
              {group.label && <p className="ds-nav-group-label">{group.label}</p>}
              {group.items.map((item, ii) => {
                const index = groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0) + ii

                // Pai expansível: cabeçalho clicável + lista de subitens.
                if (isParent(item)) {
                  const { label, icon: Icon, children } = item
                  const childActive = children.some(c => isActive(c.to, location.pathname))
                  const open = openGroups.has(label)
                  return (
                    <div key={label}>
                      <button type="button" onClick={() => toggleGroup(label)} aria-expanded={open}
                        className={`ds-nav-item ds-nav-parent ds-nav-anim ${childActive && !open ? 'ds-nav-item-active' : ''} ${childActive && open ? 'ds-nav-parent-active' : ''}`}
                        style={{ animationDelay: `${index * 30}ms` }}>
                        <Icon size={18} />
                        {label}
                        <ChevronDown size={14} className={`ml-auto ds-nav-caret ${open ? 'ds-nav-caret-open' : ''}`} />
                      </button>
                      <div className={`ds-nav-sub ${open ? 'ds-nav-sub-open' : ''}`}>
                        {children.map(({ to, label: clabel, icon: CIcon }) => {
                          const active = isActive(to, location.pathname)
                          return (
                            <Link key={to} to={to}
                              className={`ds-nav-item ds-nav-subitem ${active ? 'ds-nav-item-active' : ''}`}
                              onClick={() => setSidebarOpen(false)}>
                              <CIcon size={16} />
                              {clabel}
                              {active && <ChevronRight size={14} className="ml-auto" />}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                // Folha: link direto (comportamento original).
                const { to, label, icon: Icon } = item
                const active = isActive(to, location.pathname)
                return (
                  <Link key={to} to={to}
                    className={`ds-nav-item ds-nav-anim ${active ? 'ds-nav-item-active' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => setSidebarOpen(false)}>
                    <Icon size={18} />
                    {label}
                    {to === '/admin/suporte' && supportUnread && !active && (
                      <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'var(--accent)' }} aria-label="Resposta não lida" />
                    )}
                    {active && <ChevronRight size={14} className="ml-auto" />}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Rodapé: identidade do Trimly pro super admin (ele não é dono de
            barbearia nenhuma); barbearia + dono pra todos os outros. */}
        <div className="ds-sidebar-footer px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="ds-avatar w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0">
              {superAdmin ? <ShieldCheck size={16} /> : (settings?.businessName ?? user?.name)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="ds-user-name truncate">{superAdmin ? 'Trimly' : (settings?.businessName || 'Minha barbearia')}</p>
              <p className="ds-user-role truncate">{superAdmin ? 'Super admin' : user?.name}</p>
              <p className="ds-user-role truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="ds-logout-btn">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="ds-topbar h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="ds-icon-btn lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex-1 lg:flex-none">
            <h1 className="ds-topbar-title">{pageTitle}</h1>
          </div>
          {/* Avisos do Trimly — só pro dono (o endpoint é RequireOwner; barber/admin
              levariam 403). Some sozinho quando não há aviso nenhum. */}
          <AnnouncementsBell enabled={user?.role?.toLowerCase() === 'owner'} />
        </header>

        {/* Content — fade suave a cada troca de página */}
        <main key={location.pathname} className="ds-main-content flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
