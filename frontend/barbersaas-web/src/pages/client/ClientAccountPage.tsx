import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, LogOut, Calendar, Star, Gift, Clock } from 'lucide-react'
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
import { formatPhoneBR } from '../../lib/masks'
import { unitLabel } from '../../features/loyalty/loyaltyApi'
import type { LoyaltyMode, LoyaltyRedemptionStatus, LoyaltyRewardType } from '../../features/loyalty/loyaltyApi'
import toast from 'react-hot-toast'

// GET /client/loyalty — programa+saldo+catálogo+meus resgates numa chamada.
interface MyLoyalty {
  enabled: boolean
  mode: LoyaltyMode
  balance: number
  totalVisits: number
  rewards: { id: string; name: string; description: string | null; type: LoyaltyRewardType; cost: number }[]
  redemptions: { id: string; rewardName: string; costPaid: number; status: LoyaltyRedemptionStatus; requestedAt: string }[]
}

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
  const { hasToken, client } = useClientSession()
  const queryClient = useQueryClient()

  const { data: info } = useQuery({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug,
  })
  useEffect(() => { if (info) applyTenantTheme(info) }, [info])

  // Fonte de verdade é a API, não o que ficou em cache no localStorage de
  // sessões antigas — um client salvo antes do campo cpf existir, por
  // exemplo, ficaria preso em "perfil incompleto" pra sempre.
  // A queryKey inclui o id do cliente (claim sub): sem isso a chave era estática
  // ['client-me'] e o perfil de uma sessão anterior (número A) vazava em cache pra
  // o próximo login (número B) — abria a conta do A. Escopar por id isola cada cliente.
  const { data: freshProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['client-me', client?.id],
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

  // Logout SEMPRE limpa o cache do React Query do cliente (perfil + agendamentos):
  // o store Zustand zera sozinho, mas as queries cacheadas sobreviveriam e poderiam
  // ser servidas pro próximo cliente. removeQueries por prefixo cobre todos os ids.
  const clearClientCache = () => {
    queryClient.removeQueries({ queryKey: ['client-me'] })
    queryClient.removeQueries({ queryKey: ['client-appointments'] })
    queryClient.removeQueries({ queryKey: ['client-loyalty'] })
  }
  const handleLogout = () => { clearClientCache(); session.logout() }

  // Quem tem token mas não terminou o cadastro nunca deve "vazar" pro
  // resto do site como se tivesse conta — sair da tela de completar
  // perfil (Voltar/trocar de rota) descarta a sessão incompleta.
  const exitIfIncomplete = () => { if (session.needsProfile) handleLogout() }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <header className="h-16 flex items-center justify-between px-4 max-w-lg w-full mx-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link to={`/b/${slug}`} onClick={exitIfIncomplete} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          <ChevronLeft size={16} /> {info?.businessName ?? 'Voltar'}
        </Link>
        {session.hasToken && (
          <button onClick={handleLogout} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
        {session.loggedIn && !loadingProfile && <Account name={session.client?.name} slug={slug!} clientId={session.client?.id} />}
      </main>
    </div>
  )
}

/* ================= Conta logada ================= */
function Account({ name, slug, clientId }: { name?: string; slug: string; clientId?: string }) {
  // Mesmas chaves escopadas por id do componente pai — evita servir o perfil/
  // agendamentos de um cliente anterior pro cliente atual.
  const { data: me } = useQuery({
    queryKey: ['client-me', clientId],
    queryFn: async () => (await clientApi.get('/client/me')).data.data,
  })
  const { data: appts, isLoading } = useQuery({
    queryKey: ['client-appointments', clientId],
    queryFn: async () => (await clientApi.get('/client/appointments')).data.data as any[],
  })
  // Fidelidade: com o programa DESLIGADO (enabled:false), nem o chip de pontos
  // nem a seção aparecem — a tela fica exatamente como era antes do programa.
  const { data: loyalty } = useQuery({
    queryKey: ['client-loyalty', clientId],
    queryFn: async () => (await clientApi.get('/client/loyalty')).data.data as MyLoyalty,
  })
  const loyaltyOn = !!loyalty?.enabled

  return (
    <div className="space-y-6">
      {/* Perfil */}
      <div className="ds-card flex items-center gap-4 animate-slide-up">
        <div className="ds-icon-chip ds-icon-chip-accent font-bold flex-shrink-0" style={{ width: 56, height: 56, borderRadius: '50%', fontSize: 'var(--text-xl)' }}>
          {(me?.name || name || '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="ds-text-primary font-bold truncate" style={{ fontSize: 'var(--text-lg)' }}>{me?.name || name || 'Cliente'}</p>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{formatPhoneBR(me?.phone)}</p>
        </div>
        {loyaltyOn && (
          <div className="ml-auto text-right flex-shrink-0">
            <div className="ds-text-accent flex items-center gap-1 font-bold">
              <Star size={15} /> {loyalty.balance} {unitLabel(loyalty.mode, loyalty.balance)}
            </div>
            <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{loyalty.totalVisits} visitas</p>
          </div>
        )}
      </div>

      {/* Fidelidade — só com o programa ligado */}
      {loyaltyOn && <LoyaltySection loyalty={loyalty} clientId={clientId} />}

      <Appointments appts={appts} isLoading={isLoading} slug={slug} />
    </div>
  )
}

/* ================= Fidelidade (cliente) ================= */
const redemptionStatusLabel: Record<LoyaltyRedemptionStatus, string> = {
  Pending: 'Aguardando entrega', Delivered: 'Entregue', Cancelled: 'Cancelado',
}
const redemptionStatusVariant: Record<LoyaltyRedemptionStatus, 'warning' | 'success' | 'error'> = {
  Pending: 'warning', Delivered: 'success', Cancelled: 'error',
}

function LoyaltySection({ loyalty, clientId }: { loyalty: MyLoyalty; clientId?: string }) {
  const queryClient = useQueryClient()
  const redeem = useMutation({
    mutationFn: async (rewardId: string) =>
      (await clientApi.post('/client/loyalty/redeem', { rewardId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-loyalty', clientId] })
      toast.success('Resgate solicitado! Mostre na barbearia pra retirar.')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.errors?.[0] ?? 'Não foi possível resgatar.'),
  })

  const unit = (n: number) => unitLabel(loyalty.mode, n)
  const visible = loyalty.redemptions.slice(0, 5)

  return (
    <div className="animate-slide-up">
      <h2 className="ds-text-secondary font-semibold mb-3 px-1 flex items-center gap-1.5" style={{ fontSize: 'var(--text-sm)' }}>
        <Gift size={14} /> Fidelidade
      </h2>

      {!loyalty.rewards.length ? (
        <div className="ds-card">
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            Você tem <span className="ds-text-accent font-bold">{loyalty.balance} {unit(loyalty.balance)}</span>.
            As recompensas disponíveis vão aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {loyalty.rewards.map(r => {
            const affordable = loyalty.balance >= r.cost
            return (
              <div key={r.id} className="ds-card flex items-center gap-4">
                <div className="ds-icon-chip ds-icon-chip-accent flex-shrink-0" style={{ width: 40, height: 40 }}>
                  <Gift size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="ds-text-primary font-semibold truncate">{r.name}</p>
                  {r.description && <p className="ds-text-secondary truncate" style={{ fontSize: 'var(--text-xs)' }}>{r.description}</p>}
                  <p className="ds-text-accent font-medium mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>
                    {r.cost} {unit(r.cost)}
                  </p>
                </div>
                <Button onClick={() => redeem.mutate(r.id)} loading={redeem.isPending}
                  disabled={!affordable || redeem.isPending}
                  style={{ height: 34, padding: '0 var(--space-4)', fontSize: 'var(--text-xs)', flexShrink: 0, opacity: affordable ? 1 : 0.5 }}>
                  {affordable ? 'Resgatar' : `Faltam ${r.cost - loyalty.balance}`}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {visible.length > 0 && (
        <div className="mt-4">
          <p className="ds-text-disabled mb-2 px-1 flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
            <Clock size={12} /> Meus resgates
          </p>
          <div className="ds-card space-y-2.5" style={{ padding: 'var(--space-4)' }}>
            {visible.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="ds-text-primary truncate" style={{ fontSize: 'var(--text-sm)' }}>{r.rewardName}</p>
                  <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>
                    {format(parseISO(r.requestedAt), "dd/MM 'às' HH:mm", { locale: ptBR })} · {r.costPaid} {unit(r.costPaid)}
                  </p>
                </div>
                <Badge variant={redemptionStatusVariant[r.status]}>{redemptionStatusLabel[r.status]}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= Agendamentos ================= */
function Appointments({ appts, isLoading, slug }: { appts?: any[]; isLoading: boolean; slug: string }) {
  return (
    <>
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
    </>
  )
}
