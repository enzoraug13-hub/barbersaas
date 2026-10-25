import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, CalendarDays, Check, Gift, MessageCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
import { useClientSession } from '../../store/clientAuthStore'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Pill, type Tone } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { Wordmark } from '../../components/ui/Logo'
import { PhoneOtpStep } from '../../components/client/PhoneOtpStep'
import { CompleteProfileStep } from '../../components/client/CompleteProfileStep'
import { formatPhoneBR, onlyDigits } from '../../lib/masks'
import { brl, capFirst, firstName, hhmm } from '../../lib/format'
import { unitLabel } from '../../features/loyalty/loyaltyApi'
import type { LoyaltyMode, LoyaltyRedemptionStatus, LoyaltyRewardType } from '../../features/loyalty/loyaltyApi'
import type { TenantPublicInfo } from '../../types'
import { apiErrorMessage } from '../../lib/apiError'

// GET /client/loyalty — programa + saldo + catálogo + meus resgates numa chamada.
interface MyLoyalty {
  enabled: boolean
  mode: LoyaltyMode
  balance: number
  totalVisits: number
  rewards: { id: string; name: string; description: string | null; type: LoyaltyRewardType; cost: number }[]
  redemptions: { id: string; rewardName: string; costPaid: number; status: LoyaltyRedemptionStatus; requestedAt: string }[]
}

// Campos dos agendamentos do cliente usados na listagem.
interface MyAppointment {
  id: string; date: string; startTime?: string
  service: string; barber: string; status: string; finalPrice: number
}

// Do ponto de vista do cliente ("Faltou" é vocabulário do painel).
const clientStatus: Record<string, { label: string; tone: Tone }> = {
  Pending:   { label: 'Aguardando confirmação', tone: 'warn' },
  Confirmed: { label: 'Confirmado', tone: 'info' },
  Completed: { label: 'Concluído', tone: 'ok' },
  Cancelled: { label: 'Cancelado', tone: 'neutral' },
  NoShow:    { label: 'Não compareceu', tone: 'bad' },
}
const statusOf = (s: string) => clientStatus[s] ?? { label: s, tone: 'neutral' as Tone }

const redemptionStatus: Record<LoyaltyRedemptionStatus, { label: string; tone: Tone }> = {
  Pending:   { label: 'Retirar na barbearia', tone: 'warn' },
  Delivered: { label: 'Entregue', tone: 'ok' },
  Cancelled: { label: 'Cancelado', tone: 'neutral' },
}

const startsAt = (a: MyAppointment) => new Date(`${a.date}T${hhmm(a.startTime) || '00:00'}`)

export default function ClientAccountPage() {
  const { slug } = useParams<{ slug: string }>()
  // Primeira leitura: só para saber se há sessão e habilitar a busca do perfil
  // fresco abaixo. A decisão de UI usa a segunda leitura (com override).
  const { hasToken, client } = useClientSession()
  const queryClient = useQueryClient()

  const { data: info } = useQuery<TenantPublicInfo>({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug,
  })
  useEffect(() => {
    if (!info) return
    applyTenantTheme(info)
    document.title = `Minha conta | ${info.businessName}`
  }, [info])

  // Fonte de verdade é a API, não o cache do localStorage de sessões antigas.
  // A queryKey inclui o id do cliente: sem isso o perfil de uma sessão anterior
  // (número A) vazava para o próximo login (número B).
  const { data: freshProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['client-me', client?.id],
    queryFn: async () => (await clientApi.get('/client/me')).data.data,
    enabled: hasToken,
  })

  // freshProfile manda quando carregado; antes disso (ou se falhar) vale o store.
  const freshProfileComplete = freshProfile
    ? !!freshProfile.name?.trim() && !!freshProfile.cpf?.trim()
    : undefined
  const session = useClientSession(freshProfileComplete)
  const { updateProfile } = session

  useEffect(() => {
    if (freshProfile) updateProfile(freshProfile)
  }, [freshProfile, updateProfile])

  // Sair SEMPRE limpa o cache do React Query do cliente (perfil, agendamentos,
  // fidelidade), senão as queries sobreviveriam para o próximo cliente.
  const clearClientCache = () => {
    queryClient.removeQueries({ queryKey: ['client-me'] })
    queryClient.removeQueries({ queryKey: ['client-appointments'] })
    queryClient.removeQueries({ queryKey: ['client-loyalty'] })
  }
  const handleLogout = () => { clearClientCache(); session.logout() }

  // Quem tem token mas não terminou o cadastro não "vaza" para o resto do site:
  // sair da tela de completar perfil descarta a sessão incompleta.
  const exitIfIncomplete = () => { if (session.needsProfile) handleLogout() }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="sticky top-0 z-30 bg-surface border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="max-w-[600px] mx-auto h-14 px-2 flex items-center justify-between gap-2">
          <Link to={`/b/${slug}`} onClick={exitIfIncomplete} className={btnClass('ghost', 'md', 'min-w-0 !px-2')}>
            <ChevronLeft size={18} className="flex-shrink-0" />
            <span className="truncate">{info?.businessName ?? 'Voltar'}</span>
          </Link>
          {session.hasToken && <Button variant="ghost" onClick={handleLogout}>Sair</Button>}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[600px] mx-auto px-4 py-6">
        {!session.hasToken && (
          <div className="pt-4">
            <PhoneOtpStep slug={slug!} businessName={info?.businessName} logoUrl={info?.logoUrl} businessPhone={info?.phone}
              phoneSubtitle="Entre com seu celular para ver seus horários e sua fidelidade."
              onVerified={(t, c, complete) => session.setAuth(t, c, complete, slug!)} />
          </div>
        )}
        {session.hasToken && loadingProfile && <AccountSkeleton />}
        {session.needsProfile && !loadingProfile && session.client && (
          <div className="pt-4">
            <CompleteProfileStep client={session.client} logoUrl={info?.logoUrl} businessName={info?.businessName} onDone={session.updateProfile} />
          </div>
        )}
        {session.loggedIn && !loadingProfile && (
          <Account name={session.client?.name} slug={slug!} clientId={session.client?.id} info={info} />
        )}
      </main>

      <footer className="py-8 flex items-center justify-center gap-2 text-13 text-ink-3">
        Agendamento online por <Wordmark height={15} />
      </footer>
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-36 !rounded-panel" />
      <Skeleton className="h-48 !rounded-panel" />
    </div>
  )
}

/* ================= Conta logada ================= */
function Account({ name, slug, clientId, info }: { name?: string; slug: string; clientId?: string; info?: TenantPublicInfo }) {
  // Mesmas chaves escopadas por id do componente pai.
  const { data: me } = useQuery({
    queryKey: ['client-me', clientId],
    queryFn: async () => (await clientApi.get('/client/me')).data.data,
  })
  const { data: appts, isLoading } = useQuery({
    queryKey: ['client-appointments', clientId],
    queryFn: async () => (await clientApi.get('/client/appointments')).data.data as MyAppointment[],
  })
  // Com o programa DESLIGADO (enabled:false), nada de fidelidade aparece.
  const { data: loyalty } = useQuery({
    queryKey: ['client-loyalty', clientId],
    queryFn: async () => (await clientApi.get('/client/loyalty')).data.data as MyLoyalty,
  })
  const loyaltyOn = !!loyalty?.enabled

  const now = new Date()
  const list = appts ?? []
  const active = (a: MyAppointment) => a.status === 'Pending' || a.status === 'Confirmed'
  const upcoming = list.filter(a => active(a) && startsAt(a) >= now).sort((a, b) => +startsAt(a) - +startsAt(b))
  const history = list.filter(a => !upcoming.includes(a)).sort((a, b) => +startsAt(b) - +startsAt(a))
  const wa = onlyDigits(info?.whatsAppNumber ?? '')

  return (
    <div className="space-y-8">
      <section>
        <h1 className="t-display text-[30px] leading-9">Olá, {firstName(me?.name || name) || 'cliente'}</h1>
        {me?.phone && <p className="text-sm text-ink-2 mt-1 t-num">{formatPhoneBR(me.phone)}</p>}
      </section>

      {/* Próximos horários */}
      <section aria-labelledby="proximos">
        <div className="flex items-center justify-between mb-3">
          <h2 id="proximos" className="text-md font-semibold">{upcoming.length > 1 ? 'Próximos horários' : 'Próximo horário'}</h2>
          <Link to={`/b/${slug}`} className="ds-link text-13">Agendar outro</Link>
        </div>
        {isLoading ? <Skeleton className="h-32 !rounded-panel" /> : !upcoming.length ? (
          <div className="ds-panel ds-panel-pad">
            <p className="text-sm text-ink-2">Você não tem nenhum horário marcado.</p>
            <Link to={`/b/${slug}`} className={btnClass('primary', 'md', 'mt-4')}><CalendarDays size={16} /> Agendar horário</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a, i) => {
              const st = statusOf(a.status)
              const d = parseISO(a.date)
              return (
                <article key={a.id} className="ds-panel overflow-hidden">
                  <div className="ds-panel-pad flex gap-4">
                    <div className="w-[60px] flex-shrink-0 rounded-[10px] text-center py-2"
                      style={{ background: i === 0 ? 'var(--accent)' : 'var(--surface-3)', color: i === 0 ? 'var(--accent-fg)' : 'var(--ink)' }}>
                      <p className="text-xs font-medium" style={{ opacity: 0.8 }}>{format(d, 'MMM', { locale: ptBR }).replace('.', '')}</p>
                      <p className="t-num text-[26px] leading-7 font-semibold" style={{ fontStretch: 'var(--stretch-numeric)' }}>{format(d, 'd')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-md font-semibold">{capFirst(format(d, 'EEEE', { locale: ptBR }))}, {hhmm(a.startTime)}</p>
                      <p className="text-sm text-ink-2 mt-0.5">{a.service} com {a.barber}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <Pill tone={st.tone}>{st.label}</Pill>
                        <span className="t-num text-sm font-semibold">{brl(a.finalPrice)}</span>
                      </div>
                    </div>
                  </div>
                  {i === 0 && wa.length >= 10 && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 border-t border-line text-13 text-ink-2 hover:bg-surface-2">
                      <MessageCircle size={15} className="text-accent-ink flex-shrink-0" />
                      <span>Precisa remarcar ou cancelar? <span className="font-semibold text-accent-ink whitespace-nowrap">Fale com a barbearia</span></span>
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Fidelidade — só com o programa ligado */}
      {loyaltyOn && <LoyaltySection loyalty={loyalty} clientId={clientId} />}

      {/* Histórico */}
      {!isLoading && history.length > 0 && (
        <section aria-labelledby="historico">
          <h2 id="historico" className="text-md font-semibold mb-3">Histórico</h2>
          <ul className="ds-panel">
            {history.map(a => {
              const st = statusOf(a.status)
              return (
                <li key={a.id} className="ds-row">
                  <div className="ds-row-main">
                    <p className="ds-row-title">{a.service}</p>
                    <p className="ds-row-sub t-num">{format(parseISO(a.date), "d 'de' MMM 'de' yyyy", { locale: ptBR })}, {hhmm(a.startTime)}, com {a.barber}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="t-num text-sm font-medium">{brl(a.finalPrice)}</p>
                    {a.status !== 'Completed' && <p className="text-xs text-ink-3 mt-0.5">{st.label}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ================= Fidelidade (cliente) ================= */
function LoyaltySection({ loyalty, clientId }: { loyalty: MyLoyalty; clientId?: string }) {
  const queryClient = useQueryClient()
  const redeem = useMutation({
    mutationFn: async (rewardId: string) =>
      (await clientApi.post('/client/loyalty/redeem', { rewardId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-loyalty', clientId] })
      toast.success('Resgate pedido. Retire na barbearia.')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível resgatar.')),
  })

  const unit = (n: number) => unitLabel(loyalty.mode, n)
  const rewards = [...loyalty.rewards].sort((a, b) => a.cost - b.cost)
  // Meta mostrada no cartão: a recompensa mais barata que ainda não dá para pegar
  // (ou a mais barata de todas, se o saldo já cobre tudo).
  const target = rewards.find(r => r.cost > loyalty.balance) ?? rewards[0]
  const visible = loyalty.redemptions.slice(0, 5)

  return (
    <section aria-labelledby="fidelidade" className="space-y-3">
      <h2 id="fidelidade" className="text-md font-semibold">Fidelidade</h2>

      <div className="ds-panel ds-panel-pad">
        <div className="flex items-baseline justify-between gap-3">
          <p>
            <span className="t-num text-[34px] leading-10 font-semibold" style={{ fontStretch: 'var(--stretch-numeric)' }}>{loyalty.balance}</span>
            <span className="text-md text-ink-2 ml-1.5">{unit(loyalty.balance)}</span>
          </p>
          <p className="text-13 text-ink-3 t-num">{loyalty.totalVisits} {loyalty.totalVisits === 1 ? 'visita' : 'visitas'}</p>
        </div>

        {target && (loyalty.mode === 'Visits' && target.cost <= 20
          ? <PunchCard filled={Math.min(loyalty.balance, target.cost)} total={target.cost} />
          : (
            <div className="ds-progress ds-progress-accent mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={target.cost} aria-valuenow={Math.min(loyalty.balance, target.cost)}>
              <span style={{ width: `${Math.min(100, (loyalty.balance / Math.max(1, target.cost)) * 100)}%` }} />
            </div>
          ))}

        <p className="text-sm text-ink-2 mt-3">
          {!target
            ? 'As recompensas vão aparecer aqui.'
            : loyalty.balance >= target.cost
              ? <>Você já pode resgatar <b className="text-ink font-semibold">{target.name}</b>.</>
              : <>Faltam <b className="text-ink font-semibold t-num">{target.cost - loyalty.balance} {unit(target.cost - loyalty.balance)}</b> para {target.name}.</>}
        </p>
      </div>

      {rewards.length > 0 && (
        <ul className="ds-panel">
          {rewards.map(r => {
            const affordable = loyalty.balance >= r.cost
            const pending = redeem.isPending && redeem.variables === r.id
            return (
              <li key={r.id} className="ds-row">
                <div className="ds-row-main">
                  <p className="ds-row-title">{r.name}</p>
                  <p className="ds-row-sub t-num">{r.cost} {unit(r.cost)}</p>
                  {r.description && <p className="text-13 text-ink-3 mt-0.5">{r.description}</p>}
                </div>
                {affordable
                  ? <Button size="sm" onClick={() => redeem.mutate(r.id)} loading={pending} disabled={redeem.isPending}>Resgatar</Button>
                  : <span className="text-13 text-ink-3 t-num flex-shrink-0">Faltam {r.cost - loyalty.balance}</span>}
              </li>
            )
          })}
        </ul>
      )}

      {visible.length > 0 && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold mb-2">Meus resgates</h3>
          <ul className="ds-panel">
            {visible.map(r => {
              const st = redemptionStatus[r.status]
              return (
                <li key={r.id} className="ds-row">
                  <div className="ds-row-main">
                    <p className="ds-row-title">{r.rewardName}</p>
                    <p className="ds-row-sub t-num">{format(parseISO(r.requestedAt), "d/MM 'às' HH:mm", { locale: ptBR })}, {r.costPaid} {unit(r.costPaid)}</p>
                  </div>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

/* Cartão de carimbos (modo "a cada N cortes"): o mesmo cartãozinho de papel do balcão. */
function PunchCard({ filled, total }: { filled: number; total: number }) {
  const cols = total <= 5 ? total : total <= 12 ? Math.ceil(total / 2) : 10
  return (
    <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      role="img" aria-label={`${filled} de ${total} cortes`}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i < filled
        const last = i === total - 1
        return (
          <span key={i} className="aspect-square rounded-full flex items-center justify-center max-w-[44px] w-full justify-self-center"
            style={{
              background: on ? 'var(--accent)' : 'transparent',
              color: on ? 'var(--accent-fg)' : 'var(--ink-3)',
              border: on ? '1.5px solid var(--accent)' : `1.5px dashed ${last ? 'var(--accent-line)' : 'var(--line-strong)'}`,
            }}>
            {on ? <Check size={16} strokeWidth={2.5} /> : last ? <Gift size={15} className="text-accent-ink" /> : null}
          </span>
        )
      })}
    </div>
  )
}
