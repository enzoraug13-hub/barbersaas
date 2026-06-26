import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, LogOut, Calendar, Star } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
import { useClientSession } from '../../store/clientAuthStore'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { PhoneOtpStep } from '../../components/client/PhoneOtpStep'
import { CompleteProfileStep } from '../../components/client/CompleteProfileStep'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel: Record<string, string> = {
  Pending: 'Pendente', Confirmed: 'Confirmado', Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu',
}
const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  Pending: 'warning', Confirmed: 'info', Completed: 'success', Cancelled: 'error', NoShow: 'error',
}

export default function ClientAccountPage() {
  const { slug } = useParams<{ slug: string }>()
  // Primeira leitura: só pra saber se há sessão e poder habilitar a busca
  // do perfil fresco abaixo. A decisão de UI usa a segunda leitura (com
  // override), nunca esta.
  const { hasToken } = useClientSession()

  const { data: info } = useQuery({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug,
  })
  useEffect(() => { if (info) applyTenantTheme(info) }, [info])

  // Fonte de verdade é a API, não o que ficou em cache no localStorage de
  // sessões antigas — um client salvo antes do campo cpf existir, por
  // exemplo, ficaria preso em "perfil incompleto" pra sempre.
  const { data: freshProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['client-me'],
    queryFn: async () => (await clientApi.get('/client/me')).data.data,
    enabled: hasToken,
  })

  // freshProfile (API) é a fonte de verdade quando carregada; antes disso, ou se
  // a busca falhar, cai pro store — uma vez profileComplete:true lá (login ou
  // submit do formulário), nunca mais reabre o formulário por causa de uma
  // refetch lenta/falha.
  const freshProfileComplete = freshProfile
    ? !!freshProfile.name?.trim() && !!freshProfile.cpf?.trim()
    : undefined
  const session = useClientSession(freshProfileComplete)

  useEffect(() => {
    if (freshProfile) session.updateProfile(freshProfile)
  }, [freshProfile])

  // Quem tem token mas não terminou o cadastro nunca deve "vazar" pro
  // resto do site como se tivesse conta — sair da tela de completar
  // perfil (Voltar/trocar de rota) descarta a sessão incompleta.
  const exitIfIncomplete = () => { if (session.needsProfile) session.logout() }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <header className="h-16 flex items-center justify-between px-4 max-w-lg w-full mx-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link to={`/b/${slug}`} onClick={exitIfIncomplete} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          <ChevronLeft size={16} /> {info?.businessName ?? 'Voltar'}
        </Link>
        {session.hasToken && (
          <button onClick={session.logout} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={15} /> Sair
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {!session.hasToken && (
          <PhoneOtpStep slug={slug!} businessName={info?.businessName} logoUrl={info?.logoUrl} businessPhone={info?.phone}
            phoneSubtitle="Entre com seu telefone para ver seus agendamentos."
            onVerified={(t, c, complete) => session.setAuth(t, c, complete, slug!)} />
        )}
        {session.hasToken && loadingProfile && (
          <div className="flex justify-center py-20"><div className="ds-shimmer w-8 h-8" style={{ borderRadius: '50%' }} /></div>
        )}
        {session.needsProfile && !loadingProfile && session.client && (
          <CompleteProfileStep client={session.client} logoUrl={info?.logoUrl} businessName={info?.businessName} onDone={session.updateProfile} />
        )}
        {session.loggedIn && !loadingProfile && <Account name={session.client?.name} slug={slug!} />}
      </main>
    </div>
  )
}

/* ================= Conta logada ================= */
function Account({ name, slug }: { name?: string; slug: string }) {
  const { data: me } = useQuery({
    queryKey: ['client-me'],
    queryFn: async () => (await clientApi.get('/client/me')).data.data,
  })
  const { data: appts, isLoading } = useQuery({
    queryKey: ['client-appointments'],
    queryFn: async () => (await clientApi.get('/client/appointments')).data.data as any[],
  })

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <div className="ds-card flex items-center gap-4 animate-slide-up">
        <div className="ds-icon-chip ds-icon-chip-accent font-bold flex-shrink-0" style={{ width: 56, height: 56, borderRadius: '50%', fontSize: 'var(--text-xl)' }}>
          {(me?.name || name || '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="ds-text-primary font-bold truncate" style={{ fontSize: 'var(--text-lg)' }}>{me?.name || name || 'Cliente'}</p>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{me?.phone}</p>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <div className="ds-text-accent flex items-center gap-1 font-bold"><Star size={15} /> {me?.loyaltyPoints ?? 0}</div>
          <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{me?.totalVisits ?? 0} visitas</p>
        </div>
      </div>

      {/* Agendamentos */}
      <div>
        <h2 className="ds-text-secondary font-semibold mb-3 px-1" style={{ fontSize: 'var(--text-sm)' }}>Meus agendamentos</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ds-card flex items-center gap-4">
                <div className="ds-shimmer w-14 h-12 flex-shrink-0" style={{ borderRadius: 'var(--radius-md)' }} />
                <div className="flex-1 space-y-2.5"><div className="ds-shimmer h-4 w-1/2" style={{ borderRadius: 'var(--radius-sm)' }} /><div className="ds-shimmer h-3 w-1/3" style={{ borderRadius: 'var(--radius-sm)' }} /></div>
                <div className="ds-shimmer h-6 w-16 flex-shrink-0" style={{ borderRadius: 'var(--radius-full)' }} />
              </div>
            ))}
          </div>
        ) : !appts?.length ? (
          <EmptyState icon={Calendar} title="Você ainda não tem agendamentos"
            action={<Link to={`/b/${slug}`}><Button><Calendar size={15} /> Agendar agora</Button></Link>} />
        ) : (
          <div className="space-y-3">
            {appts.map((a, i) => {
              const isFuture = new Date(`${a.date}T${a.startTime}`) >= new Date()
              return (
                <div key={a.id} style={{
                  animationDelay: `${i * 50}ms`,
                  borderLeft: isFuture ? '3px solid var(--accent)' : '3px solid transparent',
                  opacity: isFuture ? 1 : 0.65,
                }} className="ds-card ds-card-interactive flex items-center gap-4 animate-slide-up">
                  <div className="text-center w-14 flex-shrink-0">
                    <p className="ds-text-disabled capitalize" style={{ fontSize: 'var(--text-xs)' }}>{format(parseISO(a.date), 'MMM', { locale: ptBR })}</p>
                    <p className="ds-text-primary font-bold leading-none" style={{ fontSize: 'var(--text-xl)' }}>{format(parseISO(a.date), 'dd')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="ds-text-primary font-semibold truncate">{a.service}</p>
                    <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{a.barber} · {a.startTime?.slice(0, 5)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={statusVariant[a.status] ?? 'warning'}>{statusLabel[a.status] ?? a.status}</Badge>
                    <p className="ds-text-primary font-semibold mt-1.5" style={{ fontSize: 'var(--text-sm)' }}>{fmt(a.finalPrice)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
