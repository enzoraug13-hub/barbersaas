import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Scissors, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { isSuperAdmin } from '../../lib/roles'
import { api } from '../../lib/api'
import { resetTenantTheme } from '../../lib/theme-tenant'
import { AnnouncementsBell } from '../admin/AnnouncementsBell'
import { PublicLinkButtons } from '../admin/PublicLinkButtons'
import { useMySupportMessages } from '../../features/support/supportApi'
import { useLoyaltyProgram } from '../../features/loyalty/loyaltyApi'
import { AmbientBackground } from '../ui/glass/AmbientBackground'
import { PageTransition } from '../motion/PageTransition'
import { DUR, EASE } from '../motion/tokens'
import { barbershopGroups, superAdminGroups, mobilePrimary, titleFor, leaves } from './nav/navConfig'
import { Sidebar } from './nav/Sidebar'
import { BottomNav } from './nav/BottomNav'
import { UserMenu, type Identity } from './nav/UserMenu'

// Preferência de UI (não é dado de negócio): sidebar fixada/expandida ou recolhida.
const PIN_KEY = 'trimly-sidebar-pinned'
function readPinned(): boolean {
  try { return localStorage.getItem(PIN_KEY) !== '0' } catch { return true }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const mainRef = useRef<HTMLElement>(null)
  const [pinned, setPinned] = useState(readPinned)

  const togglePin = () => setPinned(p => {
    const next = !p
    try { localStorage.setItem(PIN_KEY, next ? '1' : '0') } catch { /* sem storage: só não persiste */ }
    return next
  })

  const pageTitle = titleFor(location.pathname)

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

  // Respostas não lidas no item "Suporte" — mesmo espírito do sino de avisos: só
  // consulta quando o usuário é Owner (o endpoint é RequireOwner; barber/admin
  // levariam 403). Some quando a página é aberta (ela marca como lido).
  const isOwner = user?.role?.toLowerCase() === 'owner'
  const { data: supportMessages } = useMySupportMessages(isOwner)
  const supportUnread = supportMessages?.filter(m => m.author === 'superadmin' && !m.readAt).length ?? 0

  // Programa de fidelidade: decide se a aba aparece. Só owner/admin consultam
  // (endpoint RequireOwnerOrAdmin; barber levaria 403). Sem programa = desligado.
  const role = user?.role?.toLowerCase()
  const canSeeLoyalty = !superAdmin && (role === 'owner' || role === 'admin')
  const { data: loyaltyProgram } = useLoyaltyProgram(canSeeLoyalty)
  const loyaltyOn = canSeeLoyalty && !!loyaltyProgram?.isEnabled

  // Super admin vê só o menu do Trimly; todos os demais veem o menu da barbearia
  // exatamente como antes (com Fidelidade quando o programa está ligado).
  const groups = superAdmin ? superAdminGroups : barbershopGroups(loyaltyOn)
  const counts: Record<string, number> = { [leaves.suporte.to]: supportUnread }

  // Identidade: Trimly pro super admin (ele não é dono de barbearia nenhuma);
  // barbearia + dono pra todos os outros.
  const identity: Identity = {
    title: superAdmin ? 'Trimly' : (settings?.businessName || 'Minha barbearia'),
    subtitle: superAdmin ? 'Super admin' : user?.name,
    email: user?.email,
    avatar: superAdmin ? <ShieldCheck size={16} /> : (settings?.businessName ?? user?.name)?.[0]?.toUpperCase(),
  }

  return (
    // h-dvh (viewport dinâmico) no lugar de 100vh: no iOS Safari o 100vh inclui a
    // área atrás da barra de endereço, o documento fica rolável e o header some ao
    // rolar. h-screen permanece como fallback pra navegadores sem suporte a dvh.
    <div className="g-shell h-screen supports-[height:100dvh]:h-dvh overflow-hidden">
      <AmbientBackground />

      {/* Desktop: sidebar flutuante (recolhida/expandida) */}
      <Sidebar
        groups={groups}
        pinned={pinned}
        onTogglePin={togglePin}
        brandSub={superAdmin ? 'Super admin' : settings?.businessName}
        counts={counts}
        footer={
          <>
            {!superAdmin && <PublicLinkButtons compact />}
            <UserMenu id={identity} onLogout={handleLogout} />
          </>
        }
      />

      {/* Coluna principal — abre espaço pra sidebar fixada (248) ou recolhida (76) + margens */}
      <div className={`h-full flex flex-col min-w-0 ${pinned ? 'lg:pl-[272px]' : 'lg:pl-[100px]'}`}>
        {/* Topbar */}
        <header className="g-topbar flex items-center justify-between gap-3 px-4 lg:px-8 flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(64px + env(safe-area-inset-top))' }}>
          <span className="g-brand-mark lg:hidden" style={{ width: 30, height: 30, borderRadius: 10 }} aria-hidden="true">
            <Scissors size={15} strokeWidth={2} />
          </span>
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

        {/* Content — transição de página (saída/entrada com blur) a cada rota.
            No mobile, folga embaixo pra bottom nav flutuante + safe-area. */}
        <main ref={mainRef} className="g-main flex-1 overflow-y-auto overflow-x-hidden px-4 pt-2 lg:px-8 lg:pb-12">
          <PageTransition onExitComplete={() => mainRef.current?.scrollTo({ top: 0 })}>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile: bottom nav de vidro + "Mais" */}
      <BottomNav
        primary={superAdmin ? mobilePrimary.superAdmin : mobilePrimary.barbershop}
        groups={groups}
        counts={counts}
        identity={identity}
        onLogout={handleLogout}
        extra={!superAdmin ? <div className="g-sheet-link"><PublicLinkButtons compact /></div> : undefined}
      />
    </div>
  )
}
