import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Scissors, CheckCircle, Loader2, ChevronLeft, Clock, DollarSign, User, MapPin, Calendar as CalendarIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { publicApi, assetUrl } from '../../lib/api'
import { usePublicBarbers } from '../../features/barbers/barbersApi'
import { usePublicServices } from '../../features/services/servicesApi'
import { useAvailableSlots, useReserveSlot, useConfirmClientAppointment } from '../../features/appointments/appointmentsApi'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { useClientSession, type ClientProfile } from '../../store/clientAuthStore'
import { PhoneOtpStep } from '../../components/client/PhoneOtpStep'
import { CompleteProfileStep } from '../../components/client/CompleteProfileStep'
import { Button } from '../../components/ui/Button'
import type { TenantPublicInfo, Barber, Service } from '../../types'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

type Step = 'home' | 'service' | 'barber' | 'date' | 'slots' | 'confirm' | 'phone' | 'profile' | 'done'
// Identificação (OTP) é a PRIMEIRA etapa: o cliente só escolhe barbeiro/serviço/
// horário depois de logado. Quem já tem sessão pula direto para 'barber' (a barra
// mostra a 1ª etapa preenchida = "identificado"). 'profile' (cadastro de telefone
// novo) fica fora da barra, entre 'phone' e 'barber'.
const MAIN_STEPS: Step[] = ['phone', 'barber', 'service', 'date', 'slots', 'confirm']

// Campos do agendamento confirmado exibidos na tela de sucesso.
interface BookingResult { barberName: string; serviceName: string; date: string; startTime: string }
const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/* ---- Estados de carregamento (skeleton com shimmer) ---- */
const ListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="ds-card flex items-center gap-4">
        <div className="ds-shimmer w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="ds-shimmer h-4 w-1/2" style={{ borderRadius: 'var(--radius-sm)' }} />
          <div className="ds-shimmer h-3 w-1/3" style={{ borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
    ))}
  </div>
)
const GridSkeleton = ({ cells = 9, h = 'h-12' }: { cells?: number; h?: string }) => (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: cells }).map((_, i) => <div key={i} className={`ds-shimmer ${h}`} style={{ borderRadius: 'var(--radius-md)' }} />)}
  </div>
)

/* ---- Estado vazio (ícone + texto) ---- */
const EmptyState = ({ icon: Icon, text }: { icon: LucideIcon; text: string }) => (
  <div className="ds-card text-center py-10 animate-fade-in">
    <Icon size={34} className="mx-auto mb-3" style={{ color: 'var(--text-disabled)' }} />
    <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{text}</p>
  </div>
)

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex items-center gap-1 mb-4 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
    <ChevronLeft size={16} /> Voltar
  </button>
)

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep]         = useState<Step>('home')
  const [barber, setBarber]     = useState<Barber | null>(null)
  const [service, setService]   = useState<Service | null>(null)
  const [date, setDate]         = useState('')
  const [slot, setSlot]         = useState('')
  const [reservation, setReservation] = useState<{ id: string; expiresAtUtc: string } | null>(null)
  const [result, setResult]     = useState<BookingResult | null>(null)

  // loggedIn aqui SEMPRE exige cadastro completo (useClientSession) — token
  // sozinho nunca conta como logado.
  const session = useClientSession()
  const loggedIn = session.slug === slug && session.loggedIn

  const { data: info } = useQuery<TenantPublicInfo>({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug
  })

  useEffect(() => {
    if (!info) return
    applyTenantTheme({ primaryColor: info.primaryColor, secondaryColor: info.secondaryColor, accentColor: info.accentColor })
  }, [info])

  const { data: barbers,  isLoading: loadBarbers }  = usePublicBarbers(slug!)
  // barbeiro é escolhido antes do serviço: passamos o id pra vir o preço daquele barbeiro
  // quando o tenant tem "preço por barbeiro" ligado (effectivePrice).
  const { data: services, isLoading: loadServices } = usePublicServices(slug!, barber?.id)
  const { data: slots,    isLoading: loadSlots }    = useAvailableSlots(slug!, barber?.id ?? '', service?.id ?? '', date)
  const reserveSlot = useReserveSlot(slug!)
  const confirmAppointment = useConfirmClientAppointment()

  const nextDates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i + 1)
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEE, dd MMM", { locale: ptBR }) }
  })

  // Único ponto que grava o agendamento no banco — o cliente sempre chega aqui
  // já autenticado (OTP é a primeira etapa do fluxo).
  const finalizeBooking = async (reservationId: string) => {
    try {
      const res = await confirmAppointment.mutateAsync({ reservationId })
      setResult(res)
      setReservation(null)
      setStep('done')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível confirmar. Escolha o horário de novo.'))
      setReservation(null)
      setStep('slots')
    }
  }

  const handleConfirmClick = async () => {
    try {
      const res = await reserveSlot.mutateAsync({ barberId: barber!.id, serviceId: service!.id, date, startTime: slot })
      setReservation({ id: res.reservationId, expiresAtUtc: res.expiresAtUtc })
      // No fluxo normal o cliente já está logado (OTP veio primeiro); o else é
      // rede de segurança para sessão expirada no meio do caminho.
      if (loggedIn) await finalizeBooking(res.reservationId)
      else setStep('phone')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Esse horário acabou de ser reservado por outra pessoa.'))
      setStep('slots')
    }
  }

  const onPhoneVerified = (token: string, client: ClientProfile, profileComplete: boolean) => {
    session.setAuth(token, client, profileComplete, slug!)
    if (!profileComplete) { setStep('profile'); return }
    // Fallback raro: já havia reserva (sessão expirou depois de escolher horário) —
    // retoma a confirmação; senão, segue para a escolha do agendamento.
    if (reservation) finalizeBooking(reservation.id)
    else setStep('barber')
  }

  const onProfileDone = (patch: Partial<ClientProfile>) => {
    session.updateProfile(patch)
    if (reservation) finalizeBooking(reservation.id)
    else setStep('barber')
  }

  const back = () => {
    const i = MAIN_STEPS.indexOf(step)
    if (i > 0) setStep(MAIN_STEPS[i - 1])
  }

  const resetAll = () => {
    setStep('home'); setBarber(null); setService(null); setDate(''); setSlot(''); setReservation(null); setResult(null)
  }

  if (!info) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header — capa imponente que esmaece no fundo escuro da página (sem corte
          seco) com o nome em Sora bold por cima (melhor contraste/legibilidade
          sobre foto que a serifada). O card de endereço/horário fica intocado. */}
      <div className="relative h-72"
        style={{ background: `linear-gradient(to bottom, ${info.primaryColor || '#1a1a1a'}, var(--bg-base))` }}>
        {info.coverImageUrl && (
          <img src={assetUrl(info.coverImageUrl)} alt="capa" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.55 }} />
        )}
        {/* Degradê de emenda: transparente no topo → cor de fundo da página embaixo,
            dissolvendo a imagem sem corte e reforçando o contraste do texto. */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, color-mix(in srgb, var(--bg-base) 15%, transparent) 0%, color-mix(in srgb, var(--bg-base) 28%, transparent) 50%, color-mix(in srgb, var(--bg-base) 80%, transparent) 84%, var(--bg-base) 100%)',
        }} />
        <Link to={`/b/${slug}/conta`}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 transition-colors"
          style={{ borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '6px var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 500, color: '#fff' }}>
          <User size={14} /> Minha conta
        </Link>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {info.logoUrl ? (
            <img src={assetUrl(info.logoUrl)} alt="logo" className="w-20 h-20 object-cover mb-3" style={{ borderRadius: 'var(--radius-lg)', border: '2px solid var(--accent-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }} />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center mb-3" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
              <Scissors size={34} style={{ color: 'var(--bg-base)' }} />
            </div>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(var(--text-3xl), 7vw, var(--text-4xl))', lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--text-primary)', textShadow: '0 2px 16px rgba(0,0,0,0.55)' }}>{info.businessName}</h1>
          {info.city && <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>{info.city}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress — etapas principais, começando pela identificação (não aparece
            na tela inicial, no cadastro de perfil nem na tela de concluído) */}
        {MAIN_STEPS.includes(step) && (
          <div className="flex items-center gap-1 mb-6">
            {MAIN_STEPS.map((s) => (
              <div key={s} className="h-1 flex-1 transition-all" style={{
                borderRadius: 'var(--radius-full)',
                background: MAIN_STEPS.indexOf(step) >= MAIN_STEPS.indexOf(s) ? 'var(--tenant-primary)' : 'var(--bg-elevated)',
              }} />
            ))}
          </div>
        )}

        <div key={step} className="animate-fade-in">
        {/* Tela inicial — logo, nome, cores, horário, endereço */}
        {step === 'home' && (
          <div className="space-y-4">
            {info.description && <p className="ds-text-secondary text-center" style={{ fontSize: 'var(--text-sm)' }}>{info.description}</p>}

            {info.address && (
              <div className="ds-card flex items-start gap-3">
                <MapPin size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <div>
                  <p className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)' }}>{info.address}</p>
                  {info.city && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{info.city}</p>}
                </div>
              </div>
            )}

            {info.businessHours && info.businessHours.length > 0 && (
              <div className="ds-card">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} style={{ color: 'var(--accent)' }} />
                  <h3 className="ds-section-title" style={{ fontSize: 'var(--text-sm)' }}>Horário de funcionamento</h3>
                </div>
                <div className="space-y-1.5">
                  {info.businessHours.map(h => (
                    <div key={h.dayOfWeek} className="flex items-center justify-between" style={{ fontSize: 'var(--text-sm)' }}>
                      <span className="ds-text-secondary">{weekdayNames[h.dayOfWeek]}</span>
                      <span className={h.isOpen ? 'ds-text-primary font-medium' : 'ds-text-disabled'}>
                        {h.isOpen ? `${h.openTime} – ${h.closeTime}` : 'Fechado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Identificação primeiro: quem já tem sessão pula o OTP e vai direto escolher. */}
            <Button onClick={() => setStep(loggedIn ? 'barber' : 'phone')} className="w-full" style={{ height: 52, fontSize: 'var(--text-base)' }}>
              <CalendarIcon size={18} /> Agendar
            </Button>
          </div>
        )}

        {/* Barbeiro (1ª etapa: escolher antes do serviço pra já aplicar o preço do barbeiro) */}
        {step === 'barber' && (
          <div>
            <BackButton onClick={() => setStep('home')} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Escolha o profissional</h2>
            {loadBarbers ? <ListSkeleton />
            : !barbers?.length ? <EmptyState icon={User} text="Nenhum profissional disponível no momento." />
            : (
              <div className="space-y-3">
                {barbers.map((b, i) => (
                  <button key={b.id} onClick={() => { setBarber(b); setStep('service') }}
                    style={{ animationDelay: `${i * 45}ms`, minHeight: 64 }}
                    className="ds-card ds-card-interactive w-full text-left flex items-center gap-4 animate-slide-up">
                    {b.photoUrl
                      ? <img src={assetUrl(b.photoUrl)} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                      : <div className="ds-icon-chip ds-icon-chip-accent font-bold" style={{ width: 48, height: 48, borderRadius: '50%' }}>{b.name[0]}</div>
                    }
                    <div>
                      <p className="ds-text-primary font-semibold">{b.name}</p>
                      {b.bio && <p className="ds-text-secondary mt-0.5 line-clamp-1" style={{ fontSize: 'var(--text-xs)' }}>{b.bio}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Serviço (2ª etapa: preço já vem do barbeiro escolhido quando o tenant habilitou) */}
        {step === 'service' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Escolha o serviço</h2>
            {loadServices ? <ListSkeleton />
            : !services?.length ? <EmptyState icon={Scissors} text="Nenhum serviço disponível no momento." />
            : (
              <div className="space-y-3">
                {services.map((s, i) => (
                  <button key={s.id} onClick={() => { setService(s); setStep('date') }}
                    style={{ animationDelay: `${i * 45}ms`, minHeight: 64 }}
                    className="ds-card ds-card-interactive w-full text-left flex items-center gap-4 animate-slide-up">
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: s.colorHex ?? '#c9a84c' }} />
                    <div className="flex-1">
                      <p className="ds-text-primary font-semibold">{s.name}</p>
                      {s.description && <p className="ds-text-secondary mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{s.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="ds-text-accent flex items-center gap-1 font-semibold" style={{ fontSize: 'var(--text-sm)' }}><DollarSign size={13} />R$ {(s.effectivePrice ?? s.price).toFixed(2)}</div>
                      <div className="ds-text-disabled flex items-center gap-1 mt-0.5" style={{ fontSize: 'var(--text-xs)' }}><Clock size={11} />{s.durationMinutes} min</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data */}
        {step === 'date' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Escolha a data</h2>
            <div className="grid grid-cols-2 gap-3">
              {nextDates.map((d, i) => (
                <button key={d.value} onClick={() => { setDate(d.value); setStep('slots') }}
                  style={{
                    animationDelay: `${i * 30}ms`, minHeight: 56,
                    borderColor: date === d.value ? 'var(--accent)' : undefined,
                    background: date === d.value ? 'var(--accent-soft)' : undefined,
                  }}
                  className="ds-card ds-card-interactive text-center py-4 capitalize animate-slide-up">
                  <p className="ds-text-primary font-medium">{d.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Horários */}
        {step === 'slots' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Escolha o horário</h2>
            {loadSlots ? <GridSkeleton cells={9} h="h-12" />
            : !slots?.length ? <EmptyState icon={Clock} text="Nenhum horário disponível neste dia. Tente outra data." />
            : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s, i) => {
                  const taken    = s.available === false   // ocupado: tem agendamento/reserva
                  const selected = slot === s.start
                  return (
                    <button key={s.start} type="button"
                      // aria-disabled (em vez de `disabled`) mantém o cursor not-allowed
                      // visível; o onChange/onClick é neutralizado pra não deixar selecionar.
                      aria-disabled={taken || undefined}
                      title={taken ? 'Horário ocupado' : undefined}
                      onClick={taken ? undefined : () => { setSlot(s.start); setStep('confirm') }}
                      style={{
                        animationDelay: `${i * 20}ms`, minHeight: 44,
                        borderColor: selected ? 'var(--accent)' : undefined,
                        background: selected ? 'var(--accent-soft)' : undefined,
                        color: taken ? 'var(--text-disabled)' : selected ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: taken ? 'not-allowed' : 'pointer',
                        opacity: taken ? 0.4 : undefined,                 // esmaecido
                        filter: taken ? 'blur(0.8px)' : undefined,        // borrado
                        textDecoration: taken ? 'line-through' : undefined, // risco em cima
                      }}
                      className={`ds-card text-center font-medium animate-slide-up${taken ? '' : ' ds-card-interactive'}`}>
                      <span style={{ fontSize: 'var(--text-sm)' }}>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Resumo + Confirmar (aqui dispara a reserva — nada gravado antes disso) */}
        {step === 'confirm' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Confirme seu agendamento</h2>
            <div className="ds-card space-y-3 mb-4">
              {[
                { label: 'Serviço',      value: service?.name },
                { label: 'Profissional', value: barber?.name },
                { label: 'Data',         value: date },
                { label: 'Horário',      value: slot },
                { label: 'Valor',        value: `R$ ${(service?.effectivePrice ?? service?.price ?? 0).toFixed(2)}` },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 last:border-0" style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="ds-text-secondary">{r.label}</span>
                  <span className="ds-text-primary font-medium">{r.value}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleConfirmClick} loading={reserveSlot.isPending || confirmAppointment.isPending} className="w-full" style={{ height: 52, fontSize: 'var(--text-base)' }}>
              {reserveSlot.isPending ? 'Reservando...' : confirmAppointment.isPending ? 'Confirmando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        )}

        {/* Telefone/OTP — 1ª etapa do fluxo: identifica o cliente ANTES das escolhas.
            (expiresAtUtc só aparece no fallback raro de sessão expirada pós-reserva.) */}
        {step === 'phone' && (
          <PhoneOtpStep slug={slug!} businessName={info.businessName} logoUrl={info.logoUrl} businessPhone={info.phone}
            expiresAtUtc={reservation?.expiresAtUtc}
            phoneSubtitle="Confirme seu telefone para começar o agendamento."
            onVerified={onPhoneVerified} />
        )}

        {/* Cadastro (só se telefone novo) */}
        {step === 'profile' && session.client && (
          <CompleteProfileStep client={session.client} logoUrl={info.logoUrl} businessName={info.businessName}
            subtitle="Só falta completar seu cadastro pra escolher seu horário."
            onDone={onProfileDone} />
        )}

        {/* Concluído */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(76,175,125,0.2)', animationIterationCount: 2 }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center animate-scale-in" style={{ background: 'rgba(76,175,125,0.2)' }}>
                <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              </div>
            </div>
            <h2 className="mb-2 animate-slide-up" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)' }}>Agendado!</h2>
            <p className="ds-text-secondary mb-6 animate-slide-up" style={{ animationDelay: '60ms' }}>Seu agendamento foi confirmado. Até lá!</p>
            {result && (
              <div className="ds-card text-left space-y-2 mb-6">
                <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Barbeiro: <span className="ds-text-primary">{result.barberName}</span></p>
                <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Serviço: <span className="ds-text-primary">{result.serviceName}</span></p>
                <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Data: <span className="ds-text-primary">{result.date} às {result.startTime}</span></p>
              </div>
            )}
            <Button variant="ghost" onClick={resetAll}>
              Novo agendamento
            </Button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
