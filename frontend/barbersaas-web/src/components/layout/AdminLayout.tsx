import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard, Calendar, Users, UsersRound, Scissors, Tag, DollarSign,
  Target, Package, Settings, LogOut, Menu, X, ChevronDown, ShieldCheck, Receipt, Megaphone,
  LifeBuoy, MessagesSquare, Gift
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { isSuperAdmin } from '../../lib/roles'
import { api } from '../../lib/api'
import { resetTenantTheme } from '../../lib/theme-tenant'
import { AnnouncementsBell } from '../admin/AnnouncementsBell'
import { useMySupportMessages } from '../../features/support/supportApi'
import { useLoyaltyProgram } from '../../features/loyalty/loyaltyApi'
import { AmbientBackground } from '../ui/glass/AmbientBackground'
import { PageTransition } from '../motion/PageTransition'
import { Stagger, StaggerItem } from '../motion/Stagger'
import { DUR, EASE } from '../motion/tokens'

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

// Aba Fidelidade: só entra no menu quando o programa do tenant está LIGADO
// (LoyaltyProgram.IsEnabled) — desligado, a fidelidade some do painel inteiro.
const loyaltyLeaf: NavLeaf = { to: '/admin/fidelidade', label: 'Fidelidade', icon: Gift }
const navGroupsWithLoyalty: { label: string | null; items: NavEntry[] }[] = navGroups.map(g =>
  g.label === 'Gestão' ? { ...g, items: [g.items[0], loyaltyLeaf, ...g.items.slice(1)] } : g)

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
  loyaltyLeaf, superAdminLeaf, superAdminInvoicesLeaf, superAdminAnnouncementsLeaf, superAdminSupportLeaf,
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
  const mainRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

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
  // barbearia e responderia 403 — ele não pertence a tenant nenhum).
  const superAdmin = isSuperAdmin(user?.role)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
    staleTime: 5 * 60 * 1000,
    enabled: !superAdmin,
  })
  // Painel admin SEMPRE na identidade Trimly (dourado #C9A84C de tokens.css). A cor
  // da barbearia vale só na área pública (/b/:slug e conta do cliente), que aplica
  // o tema dela; ao entrar no painel, limpa qualquer override que tenha ficado.
  useEffect(() => { resetTenantTheme() }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  // Pontinho de resposta não-lida no item "Suporte" — mesmo espírito do sino de
  // avisos: só consulta quando o usuário é Owner (o endpoint é RequireOwner;
  // barber/admin levariam 403). Some quando a página é aberta (ela marca como lido).
  const isOwner = user?.role?.toLowerCase() === 'owner'
  const { data: supportMessages } = useMySupportMessages(isOwner)
  const supportUnread = supportMessages?.some(m => m.author === 'superadmin' && !m.readAt) ?? false

  // Programa de fidelidade: decide se a aba aparece. Só owner/admin consultam
  // (endpoint RequireOwnerOrAdmin; barber levaria 403). Sem programa = desligado.
  const role = user?.role?.toLowerCase()
  const canSeeLoyalty = !superAdmin && (role === 'owner' || role === 'admin')
  const { data: loyaltyProgram } = useLoyaltyProgram(canSeeLoyalty)
  const loyaltyOn = canSeeLoyalty && !!loyaltyProgram?.isEnabled

  // Super admin vê só o menu do Trimly; todos os demais veem o menu da barbearia
  // exatamente como antes (com Fidelidade quando o programa está ligado).
  const groups = superAdmin ? superAdminGroups : loyaltyOn ? navGroupsWithLoyalty : navGroups

  // Indicador ativo (pílula deslizante via layoutId) — só um item por vez o recebe.
  const indicator = (
    <motion.span layoutId="g-nav-active" className="g-nav-indicator" aria-hidden="true"
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }} />
  )

  return (
    // h-dvh (viewport dinâmico) no lugar de 100vh: no iOS Safari o 100vh inclui a
    // área atrás da barra de endereço, o documento fica rolável e o header (com o
    // botão ☰) some ao rolar. h-screen permanece como fallback pra navegadores
    // sem suporte a dvh. No desktop dvh === vh — nada muda.
    <div className="g-shell flex h-screen supports-[height:100dvh]:h-dvh overflow-hidden">
      <AmbientBackground />

      {/* Overlay Mobile (fundo desfocado atrás do drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div key="nav-scrim" className="g-overlay lg:hidden" style={{ zIndex: 30 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: DUR.base }}
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar — vidro flutuante no desktop, drawer no mobile */}
      <aside className={`g-sidebar fixed lg:static z-40 top-2 bottom-2 left-2 lg:my-3 lg:ml-3 w-[264px] lg:w-[248px] flex-shrink-0 rounded-[22px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="g-brand-mark">
              <Scissors size={16} />
            </div>
            <span className="g-brand-name">Trimly</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="g-icon-btn lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <LayoutGroup id="admin-nav">
        <motion.nav layoutScroll className="flex-1 overflow-y-auto pb-4 px-3">
          <Stagger stagger={0.03} delay={0.05}>
          {groups.map(group => (
            <div key={group.label ?? 'root'}>
              {group.label && <StaggerItem layout="position"><p className="g-nav-group">{group.label}</p></StaggerItem>}
              {group.items.map(item => {
                // Pai expansível: cabeçalho clicável + lista de subitens.
                if (isParent(item)) {
                  const { label, icon: Icon, children } = item
                  const childActive = children.some(c => isActive(c.to, location.pathname))
                  const open = openGroups.has(label)
                  return (
                    <StaggerItem key={label} layout="position">
                      <button type="button" onClick={() => toggleGroup(label)} aria-expanded={open}
                        className={`g-nav-item ${childActive && !open ? 'g-nav-item--active' : ''} ${childActive && open ? 'g-nav-item--parent-active' : ''}`}>
                        {childActive && !open && indicator}
                        <Icon size={18} />
                        <span>{label}</span>
                        <motion.span className="ml-auto flex" animate={{ rotate: open ? 180 : 0 }}
                          transition={{ duration: DUR.base, ease: EASE }}>
                          <ChevronDown size={14} />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div key="sub" className="g-nav-sub"
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: DUR.base, ease: EASE }}>
                            {children.map(({ to, label: clabel, icon: CIcon }) => {
                              const active = isActive(to, location.pathname)
                              return (
                                <Link key={to} to={to}
                                  className={`g-nav-item ${active ? 'g-nav-item--active' : ''}`}
                                  aria-current={active ? 'page' : undefined}
                                  onClick={() => setSidebarOpen(false)}>
                                  {active && indicator}
                                  <CIcon size={16} />
                                  <span>{clabel}</span>
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </StaggerItem>
                  )
                }

                // Folha: link direto (comportamento original).
                const { to, label, icon: Icon } = item
                const active = isActive(to, location.pathname)
                return (
                  <StaggerItem key={to} layout="position">
                    <Link to={to}
                      className={`g-nav-item ${active ? 'g-nav-item--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setSidebarOpen(false)}>
                      {active && indicator}
                      <Icon size={18} />
                      <span>{label}</span>
                      {to === '/admin/suporte' && supportUnread && !active && (
                        <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} aria-label="Resposta não lida" />
                      )}
                    </Link>
                  </StaggerItem>
                )
              })}
            </div>
          ))}
          </Stagger>
        </motion.nav>
        </LayoutGroup>

        {/* Rodapé: identidade do Trimly pro super admin (ele não é dono de
            barbearia nenhuma); barbearia + dono pra todos os outros. */}
        <div className="px-3 pb-3 pt-2">
          <div className="g-user-card mb-1">
            <div className="g-avatar w-9 h-9 text-sm" style={{ background: 'var(--g-accent-soft)', borderColor: 'var(--g-accent-line)', color: 'var(--accent)' }}>
              {superAdmin ? <ShieldCheck size={16} /> : (settings?.businessName ?? user?.name)?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="g-fg-1 truncate text-[13px] font-semibold">{superAdmin ? 'Trimly' : (settings?.businessName || 'Minha barbearia')}</p>
              <p className="g-fg-2 truncate text-[11px] capitalize">{superAdmin ? 'Super admin' : user?.name}</p>
              <p className="g-fg-3 truncate text-[11px]">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="g-nav-item g-nav-logout">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="g-topbar h-16 flex items-center justify-between gap-3 px-4 lg:px-8 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="g-icon-btn lg:hidden" aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1 key={pageTitle} className="g-topbar-title truncate"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: DUR.base, ease: EASE }}>
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
          </div>
          {/* Sino do dono: avisos do Trimly + resgates de fidelidade pendentes
              (duas fontes agregadas no componente — resgate NÃO é Announcement).
              Some sozinho quando não há nada. */}
          <AnnouncementsBell enabled={isOwner} loyaltyEnabled={loyaltyOn} />
        </header>

        {/* Content — transição de página (saída/entrada com blur) a cada rota */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-2 lg:px-8 lg:pb-10">
          <PageTransition onExitComplete={() => mainRef.current?.scrollTo({ top: 0 })}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
