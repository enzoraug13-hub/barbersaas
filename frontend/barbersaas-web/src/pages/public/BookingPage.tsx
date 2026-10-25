import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, MessageCircle, AtSign, UserRound, CalendarPlus, CircleCheck, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { publicApi, assetUrl } from '../../lib/api'
import { usePublicBarbers } from '../../features/barbers/barbersApi'
import { usePublicServices } from '../../features/services/servicesApi'
import { useAvailableSlots, useReserveSlot, useConfirmClientAppointment } from '../../features/appointments/appointmentsApi'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { useClientSession, type ClientProfile } from '../../store/clientAuthStore'
import { PhoneOtpStep } from '../../components/client/PhoneOtpStep'
import { CompleteProfileStep } from '../../components/client/CompleteProfileStep'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Avatar } from '../../components/ui/Avatar'
import { Wordmark } from '../../components/ui/Logo'
import { Skeleton } from '../../components/ui/Skeleton'
import { brl, capFirst, WEEKDAY_SHORT, toMinutes, hhmm } from '../../lib/format'
import { onlyDigits } from '../../lib/masks'
import { openStatus } from '../../lib/hours'
import { downloadIcs } from '../../lib/ics'
import type { TenantPublicInfo, Barber, Service, Slot, BusinessHour } from '../../types'
import { apiErrorMessage } from '../../lib/apiError'

type Step = 'home' | 'phone' | 'profile' | 'barber' | 'service' | 'date' | 'confirm' | 'done'
// Identificação (código por SMS) vem primeiro: quem já tem sessão pula direto
// para o barbeiro. 'profile' (cadastro de número novo) fica fora da contagem.
const MAIN_STEPS: Step[] = ['phone', 'barber', 'service', 'date', 'confirm']
const STEP_TITLE: Partial<Record<Step, string>> = {
  phone: 'Identificação', profile: 'Seus dados', barber: 'Escolha o profissional',
  service: 'Escolha o serviço', date: 'Escolha o dia e o horário', confirm: 'Confira e confirme',
}

// Agendamento confirmado (resposta do backend) exibido na tela de sucesso.
interface BookingResult { barberName: string; serviceName: string; date: string; startTime: string }
const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const longDate = (ymd: string) => capFirst(format(parseISO(ymd), "EEEE, d 'de' MMMM", { locale: ptBR }))
const mapsUrl = (address: string, city?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city].filter(Boolean).join(', '))}`

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step, setStep]         = useState<Step>('home')
  const [barber, setBarber]     = useState<Barber | null>(null)
  const [service, setService]   = useState<Service | null>(null)
  const [date, setDate]         = useState('')
  const [slot, setSlot]         = useState('')
  const [reservation, setReservation] = useState<{ id: string; expiresAtUtc: string } | null>(null)
  const [result, setResult]     = useState<BookingResult | null>(null)

  // "Logado" aqui SEMPRE exige cadastro completo (useClientSession).
  const session = useClientSession()
  const loggedIn = session.slug === slug && session.loggedIn

  const { data: info } = useQuery<TenantPublicInfo>({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug,
  })

  useEffect(() => {
    if (!info) return
    applyTenantTheme({ primaryColor: info.primaryColor, secondaryColor: info.secondaryColor, accentColor: info.accentColor })
    document.title = `${info.businessName} | Agendar horário`
  }, [info])

  const { data: barbers,  isLoading: loadBarbers }  = usePublicBarbers(slug!)
  // O barbeiro vem antes do serviço: com "preço por barbeiro" ligado, o preço já vem dele.
  const { data: services, isLoading: loadServices } = usePublicServices(slug!, barber?.id)
  const { data: slots,    isLoading: loadSlots }    = useAvailableSlots(slug!, barber?.id ?? '', service?.id ?? '', date)
  const reserveSlot = useReserveSlot(slug!)
  const confirmAppointment = useConfirmClientAppointment()

  const nextDates = Array.from({ length: 14 }, (_, i) => format(addDays(new Date(), i + 1), 'yyyy-MM-dd'))
  // Dias em que a barbearia não abre ficam visíveis, mas sem escolha (sem horário cadastrado = todos valem).
  const openWeekdays = info?.businessHours?.length ? new Set(info.businessHours.filter(h => h.isOpen).map(h => h.dayOfWeek)) : null
  const isClosedDay = (ymd: string) => !!openWeekdays && !openWeekdays.has(parseISO(ymd).getDay())
  const firstOpenDate = nextDates.find(d => !isClosedDay(d)) ?? nextDates[0]

  // Único ponto que grava o agendamento — o cliente chega aqui já identificado.
  const finalizeBooking = async (reservationId: string) => {
    try {
      const res = await confirmAppointment.mutateAsync({ reservationId })
      setResult(res)
      setReservation(null)
      setStep('done')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível confirmar. Escolha o horário de novo.'))
      setReservation(null)
      setStep('date')
    }
  }

  const handleConfirmClick = async () => {
    try {
      const res = await reserveSlot.mutateAsync({ barberId: barber!.id, serviceId: service!.id, date, startTime: slot })
      setReservation({ id: res.reservationId, expiresAtUtc: res.expiresAtUtc })
      // Normalmente o cliente já está identificado; o else cobre sessão expirada no meio.
      if (loggedIn) await finalizeBooking(res.reservationId)
      else setStep('phone')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.'))
      setStep('date')
    }
  }

  const onPhoneVerified = (token: string, client: ClientProfile, profileComplete: boolean) => {
    session.setAuth(token, client, profileComplete, slug!)
    if (!profileComplete) { setStep('profile'); return }
    // Raro: já havia reserva (sessão expirou depois de escolher o horário).
    if (reservation) finalizeBooking(reservation.id)
    else setStep('barber')
  }

  const onProfileDone = (patch: Partial<ClientProfile>) => {
    session.updateProfile(patch)
    if (reservation) finalizeBooking(reservation.id)
    else setStep('barber')
  }

  const back = () => {
    if (step === 'profile') { setStep('phone'); return }
    const i = MAIN_STEPS.indexOf(step)
    if (i > 0 && !(i === 1 && loggedIn)) setStep(MAIN_STEPS[i - 1])
    // De volta à página da barbearia: a tabela de preços volta ao preço base.
    else { setBarber(null); setStep('home') }
  }

  const resetAll = () => {
    setStep('home'); setBarber(null); setService(null); setDate(''); setSlot(''); setReservation(null); setResult(null)
  }

  const startBooking = () => setStep(loggedIn ? 'barber' : 'phone')

  if (!info) {
    return (
      <div className="min-h-screen bg-surface">
        <Skeleton className="h-[140px] sm:h-[220px] !rounded-none" />
        <div className="max-w-[560px] mx-auto px-5 -mt-10 space-y-3">
          <Skeleton className="w-20 h-20 !rounded-[18px]" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  /* ---------------- Página da barbearia ---------------- */
  if (step === 'home') {
    const status = openStatus(info.businessHours)
    const wa = onlyDigits(info.whatsAppNumber ?? '')
    const publicServices = [...(services ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
    const hasHours = !!info.businessHours?.length

    return (
      <div className="min-h-screen bg-surface pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="relative">
          <div className={`w-full overflow-hidden ${info.coverImageUrl ? 'h-[150px] sm:h-[260px]' : 'h-[112px] sm:h-[168px]'}`} style={{ background: 'var(--hero)' }}>
            {info.coverImageUrl && <img src={assetUrl(info.coverImageUrl)} alt="" className="w-full h-full object-cover" />}
          </div>
          <Link to={`/b/${slug}/conta`}
            className="absolute right-3 lg:right-6 top-[calc(12px+env(safe-area-inset-top))] inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-13 font-semibold bg-surface text-ink"
            style={{ boxShadow: '0 1px 3px rgba(19,33,43,0.18)' }}>
            <UserRound size={15} /> {loggedIn ? 'Meus horários' : 'Minha conta'}
          </Link>
        </header>

        <main className="max-w-[600px] lg:max-w-[1040px] mx-auto px-5 lg:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
            <div className="min-w-0">
              {/* Identidade */}
              <section className="-mt-11 relative">
                {info.logoUrl
                  ? <img src={assetUrl(info.logoUrl)} alt={`Logo ${info.businessName}`} className="w-[88px] h-[88px] rounded-[20px] object-cover border-4 border-surface bg-surface" style={{ boxShadow: '0 2px 10px rgba(19,33,43,0.14)' }} />
                  : <span className="inline-flex border-4 border-surface rounded-[20px]" style={{ boxShadow: '0 2px 10px rgba(19,33,43,0.14)' }}><Avatar name={info.businessName} size={80} className="!rounded-[16px]" /></span>}
                <h1 className="t-display text-[32px] leading-9 lg:text-[40px] lg:leading-[44px] mt-3">{info.businessName}</h1>
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-sm">
                  {status && (
                    <span className={`inline-flex items-center gap-1.5 font-medium ${status.open ? 'text-ok' : 'text-ink-2'}`}>
                      <span className="w-2 h-2 rounded-full" style={{ background: status.open ? 'var(--ok-solid)' : 'var(--line-strong)' }} />
                      {status.text}
                    </span>
                  )}
                  {info.city && <span className="text-ink-2">{info.city}</span>}
                </div>
                {info.description && <p className="text-md text-ink-2 mt-3 max-w-[56ch]">{info.description}</p>}

                <div className="flex gap-2 mt-4 flex-wrap">
                  {wa.length >= 10 && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={btnClass('secondary', 'sm')}><MessageCircle size={15} /> WhatsApp</a>
                  )}
                  {info.instagramUrl && (
                    <a href={info.instagramUrl} target="_blank" rel="noopener noreferrer" className={btnClass('secondary', 'sm')}><AtSign size={15} /> Instagram</a>
                  )}
                  {info.address && (
                    <a href={mapsUrl(info.address, info.city)} target="_blank" rel="noopener noreferrer" className={btnClass('secondary', 'sm')}><MapPin size={15} /> Como chegar</a>
                  )}
                </div>
              </section>

              {/* Tabela de preços */}
              {(loadServices || publicServices.length > 0) && (
                <section className="mt-9 lg:mt-12" aria-labelledby="precos">
                  <h2 id="precos" className="text-md font-semibold mb-1">Serviços e preços</h2>
                  {loadServices ? <div className="space-y-3 mt-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}</div> : (
                    <ul>
                      {publicServices.map(s => (
                        <li key={s.id} className="py-3.5 border-b border-line last:border-b-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-md">{s.name}</span>
                            <span className="flex-1 border-b-2 border-dotted border-line-strong translate-y-[-4px] min-w-[16px]" aria-hidden />
                            <span className="t-num text-[19px] leading-6 font-semibold" style={{ fontStretch: 'var(--stretch-numeric)' }}>{brl(s.effectivePrice ?? s.price)}</span>
                          </div>
                          <p className="text-13 text-ink-3 mt-0.5">
                            {s.durationMinutes} min{s.description ? <span className="text-ink-2">. {s.description.replace(/\.$/, '')}.</span> : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Equipe */}
              {!!barbers?.length && (
                <section className="mt-9 lg:mt-12" aria-labelledby="equipe">
                  <h2 id="equipe" className="text-md font-semibold mb-4">Equipe</h2>
                  <ul className="flex gap-5 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap" style={{ scrollbarWidth: 'none' }}>
                    {barbers.map(b => (
                      <li key={b.id} className="flex flex-col items-center gap-2 w-[76px] flex-shrink-0 text-center">
                        <Avatar name={b.name} src={b.photoUrl} size={64} />
                        <span className="text-13 font-medium leading-tight">{b.name.split(' ')[0]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Celular: horário e endereço no fluxo da página */}
              <div className="lg:hidden">
                {hasHours && (
                  <section className="mt-9" aria-labelledby="horario">
                    <h2 id="horario" className="text-md font-semibold mb-1">Horário de funcionamento</h2>
                    <HoursList hours={info.businessHours!} />
                  </section>
                )}
                {info.address && (
                  <section className="mt-9" aria-labelledby="endereco">
                    <h2 id="endereco" className="text-md font-semibold mb-2">Endereço</h2>
                    <AddressLink address={info.address} city={info.city} />
                  </section>
                )}
              </div>
            </div>

            {/* Desktop: cartão fixo com a ação principal, horário e endereço */}
            <aside className="hidden lg:block">
              <div className="sticky top-6 mt-8 ds-panel ds-panel-pad">
                <p className="text-md font-semibold">Agende pelo site</p>
                <p className="text-sm text-ink-2 mt-0.5">Escolha o profissional, o serviço e o horário. Leva menos de um minuto.</p>
                <Button size="lg" block onClick={startBooking} className="mt-4">Agendar horário</Button>
                {hasHours && (
                  <div className="mt-6">
                    <p className="text-sm font-semibold mb-1">Horário de funcionamento</p>
                    <HoursList hours={info.businessHours!} compact />
                  </div>
                )}
                {info.address && (
                  <div className="mt-5">
                    <p className="text-sm font-semibold mb-2">Endereço</p>
                    <AddressLink address={info.address} city={info.city} />
                  </div>
                )}
              </div>
            </aside>
          </div>

          <footer className="mt-12 mb-8 flex items-center justify-center gap-2 text-13 text-ink-3">
            Agendamento online por <Wordmark height={15} />
          </footer>
        </main>

        {/* Botão fixo no celular */}
        <div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-surface border-t border-line px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <Button size="lg" block onClick={startBooking}>Agendar horário</Button>
        </div>
      </div>
    )
  }

  /* ---------------- Fluxo de agendamento ---------------- */
  const stepIndex = MAIN_STEPS.indexOf(step)
  const showProgress = stepIndex >= 0
  const svcPrice = service ? (service.effectivePrice ?? service.price) : 0

  return (
    <div className="min-h-screen bg-canvas">
      {step !== 'done' && (
        <header className="sticky top-0 z-30 bg-surface border-b border-line pt-[env(safe-area-inset-top)]">
          <div className="max-w-[600px] mx-auto h-14 px-2 flex items-center gap-1">
            <Button variant="ghost" icon onClick={back} aria-label="Voltar"><ChevronLeft size={20} /></Button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink-3 truncate">{info.businessName}</p>
              <p className="text-sm font-semibold truncate">{STEP_TITLE[step]}</p>
            </div>
            {showProgress && <span className="text-13 text-ink-2 t-num pr-3">{stepIndex + 1} de {MAIN_STEPS.length}</span>}
          </div>
          {showProgress && (
            <div className="max-w-[600px] mx-auto px-4 pb-3 flex gap-1" aria-hidden>
              {MAIN_STEPS.map((s, i) => (
                <span key={s} className="h-1 flex-1 rounded-full" style={{ background: i <= stepIndex ? 'var(--accent)' : 'var(--surface-3)' }} />
              ))}
            </div>
          )}
        </header>
      )}

      <main className="max-w-[600px] mx-auto px-4 py-5">
        {/* Escolhas feitas (toque para trocar) */}
        {(step === 'service' || step === 'date' || step === 'confirm') && (
          <div className="flex gap-2 flex-wrap mb-4">
            {barber && <SummaryChip label={barber.name} onClick={() => setStep('barber')} />}
            {service && step !== 'service' && <SummaryChip label={service.name} onClick={() => setStep('service')} />}
            {date && slot && step === 'confirm' && <SummaryChip label={`${WEEKDAY_SHORT[parseISO(date).getDay()]}, ${format(parseISO(date), 'd/MM')} às ${slot}`} onClick={() => setStep('date')} />}
          </div>
        )}

        {step === 'phone' && (
          <PhoneOtpStep compact slug={slug!} businessName={info.businessName} logoUrl={info.logoUrl} businessPhone={info.phone}
            expiresAtUtc={reservation?.expiresAtUtc}
            phoneSubtitle="Usamos seu celular para confirmar o horário e lembrar você."
            onVerified={onPhoneVerified} />
        )}

        {step === 'profile' && session.client && (
          <CompleteProfileStep compact client={session.client} logoUrl={info.logoUrl} businessName={info.businessName}
            subtitle="Primeira vez por aqui: só precisamos de nome e CPF."
            onDone={onProfileDone} />
        )}

        {step === 'barber' && (
          loadBarbers ? <OptionsSkeleton /> : !barbers?.length ? (
            <EmptyChoice text="Nenhum profissional disponível para agendamento online no momento." />
          ) : (
            <ul className="ds-panel overflow-hidden">
              {barbers.map(b => (
                <li key={b.id}>
                  <button type="button" className="ds-row py-4" onClick={() => { setBarber(b); setService(null); setStep('service') }}>
                    <Avatar name={b.name} src={b.photoUrl} size={48} />
                    <div className="ds-row-main">
                      <p className="ds-row-title text-md">{b.name}</p>
                      {b.bio && <p className="text-13 text-ink-2 line-clamp-2">{b.bio}</p>}
                    </div>
                    <ChevronRight size={18} className="text-ink-3 flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {step === 'service' && (
          loadServices ? <OptionsSkeleton /> : !services?.length ? (
            <EmptyChoice text="Este profissional ainda não tem serviços disponíveis online." />
          ) : (
            <ul className="ds-panel overflow-hidden">
              {[...services].sort((a, b) => a.displayOrder - b.displayOrder).map(s => (
                <li key={s.id}>
                  <button type="button" className="ds-row py-4 items-start"
                    onClick={() => { setService(s); setSlot(''); setDate(d => d || firstOpenDate); setStep('date') }}>
                    <div className="ds-row-main">
                      <p className="ds-row-title text-md whitespace-normal">{s.name}</p>
                      {s.description && <p className="text-13 text-ink-2 mt-0.5">{s.description}</p>}
                      <p className="text-13 text-ink-3 mt-0.5 flex items-center gap-1"><Clock size={13} /> {s.durationMinutes} min</p>
                    </div>
                    <span className="t-num font-semibold text-md">{brl(s.effectivePrice ?? s.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {step === 'date' && (
          <div className="space-y-5">
            <DayStrip days={nextDates} value={date} isClosed={isClosedDay} onChange={d => { setDate(d); setSlot('') }} />
            <div>
              <p className="text-sm font-semibold mb-3">{date ? longDate(date) : 'Escolha um dia'}</p>
              {!date ? null : loadSlots ? (
                <div className="grid grid-cols-4 gap-2">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
              ) : !slots?.some(s => s.available !== false) ? (
                <EmptyChoice text="Sem horários livres neste dia. Tente outro dia." />
              ) : (
                <SlotGroups slots={slots} value={slot} onPick={s => { setSlot(s); setStep('confirm') }} />
              )}
            </div>
          </div>
        )}

        {step === 'confirm' && barber && service && (
          <div className="space-y-4">
            <div className="ds-panel ds-panel-pad">
              <p className="t-display text-[24px] leading-7">{longDate(date)}</p>
              <p className="t-num text-[34px] leading-10 font-semibold mt-1" style={{ fontStretch: 'var(--stretch-numeric)' }}>{slot}</p>
              <dl className="ds-dl mt-3">
                <div><dt>Serviço</dt><dd>{service.name}</dd></div>
                <div><dt>Profissional</dt><dd>{barber.name}</dd></div>
                <div><dt>Duração</dt><dd className="t-num">{service.durationMinutes} min</dd></div>
                <div><dt>Valor</dt><dd className="t-num">{brl(svcPrice)}</dd></div>
                <div><dt>Local</dt><dd className="font-normal">{info.businessName}{info.address ? `, ${info.address}` : ''}</dd></div>
              </dl>
            </div>
            <Button size="lg" block onClick={handleConfirmClick} loading={reserveSlot.isPending || confirmAppointment.isPending}>
              Confirmar agendamento
            </Button>
            <p className="text-13 text-ink-3 text-center">O pagamento é feito na barbearia.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-ok-soft text-ok-solid flex items-center justify-center mx-auto animate-[ds-dialog-in_240ms_ease-out]">
              <CircleCheck size={34} strokeWidth={2} />
            </div>
            <h1 className="t-display text-[30px] leading-9 mt-5">Horário marcado</h1>
            <p className="text-md text-ink-2 mt-1">Te esperamos na {info.businessName}.</p>

            <div className="ds-panel ds-panel-pad text-left mt-6">
              {date && <p className="t-display text-[22px] leading-7">{longDate(date)}, {result?.startTime?.slice(0, 5) || slot}</p>}
              <dl className="ds-dl mt-2">
                <div><dt>Serviço</dt><dd>{result?.serviceName ?? service?.name}</dd></div>
                <div><dt>Profissional</dt><dd>{result?.barberName ?? barber?.name}</dd></div>
                {info.address && <div><dt>Endereço</dt><dd className="font-normal">{info.address}</dd></div>}
              </dl>
            </div>

            <div className="mt-5 space-y-2">
              {date && service && (
                <Button variant="secondary" size="lg" block onClick={() => downloadIcs({
                  title: `${service.name} na ${info.businessName}`,
                  date, start: (result?.startTime?.slice(0, 5) || slot),
                  durationMinutes: service.durationMinutes,
                  location: [info.address, info.city].filter(Boolean).join(', '),
                  description: `Com ${result?.barberName ?? barber?.name ?? ''}`,
                })}>
                  <CalendarPlus size={17} /> Salvar na agenda do celular
                </Button>
              )}
              <Link to={`/b/${slug}/conta`} className={btnClass('ghost', 'lg', 'w-full')}>Ver meus horários</Link>
              <button type="button" onClick={resetAll} className="ds-link text-13 mt-2">Fazer outro agendamento</button>
            </div>

            <p className="mt-12 flex items-center justify-center gap-2 text-13 text-ink-3">Agendamento online por <Wordmark height={15} /></p>
          </div>
        )}
      </main>
    </div>
  )
}

/* ---------- Peças da página da barbearia ---------- */
function HoursList({ hours, compact }: { hours: BusinessHour[]; compact?: boolean }) {
  const today = new Date().getDay()
  return (
    <ul>
      {[1, 2, 3, 4, 5, 6, 0].map(d => {
        const h = hours.find(x => x.dayOfWeek === d)
        if (!h) return null
        const isToday = d === today
        return (
          <li key={d} className={`flex items-center justify-between ${compact ? 'py-1.5 text-13' : 'py-2.5 text-sm border-b border-line last:border-b-0'} ${isToday ? 'font-semibold' : ''}`}>
            <span className={isToday ? 'text-ink' : 'text-ink-2'}>{weekdayNames[d]}{isToday && <span className="ml-2 text-xs font-medium text-accent-ink">hoje</span>}</span>
            <span className={`t-num ${h.isOpen ? '' : 'text-ink-3'}`}>{h.isOpen ? `${hhmm(h.openTime)} às ${hhmm(h.closeTime)}` : 'Fechado'}</span>
          </li>
        )
      })}
    </ul>
  )
}

function AddressLink({ address, city }: { address: string; city?: string }) {
  return (
    <a href={mapsUrl(address, city)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-4 rounded-panel border border-line hover:bg-surface-2">
      <MapPin size={18} className="text-accent-ink flex-shrink-0 mt-0.5" />
      <span className="flex-1 text-sm">
        {address}{city ? <span className="block text-ink-2">{city}</span> : null}
      </span>
      <ChevronRight size={18} className="text-ink-3 flex-shrink-0" />
    </a>
  )
}

/* ---------- Peças do fluxo ---------- */
function SummaryChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-line-strong bg-surface text-13 font-medium hover:border-accent-ink">
      {label}
      <span className="text-accent-ink text-xs font-semibold">Trocar</span>
    </button>
  )
}

function OptionsSkeleton() {
  return (
    <div className="ds-panel">
      {[0, 1, 2].map(i => (
        <div key={i} className="ds-row py-4"><Skeleton className="w-12 h-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></div>
      ))}
    </div>
  )
}

function EmptyChoice({ text }: { text: string }) {
  return <div className="ds-panel ds-panel-pad text-center text-sm text-ink-2">{text}</div>
}

function DayStrip({ days, value, onChange, isClosed }: { days: string[]; value: string; onChange: (d: string) => void; isClosed: (d: string) => boolean }) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }} role="listbox" aria-label="Dias disponíveis">
      {days.map((d, i) => {
        const dt = parseISO(d)
        const selected = d === value
        const closed = isClosed(d)
        const showMonth = i === 0 || dt.getDate() === 1
        return (
          <button key={d} type="button" role="option" aria-selected={selected} disabled={closed} onClick={() => onChange(d)}
            aria-label={closed ? `${format(dt, "d 'de' MMMM", { locale: ptBR })}, fechado` : undefined}
            className="flex-shrink-0 w-[58px] h-[72px] rounded-[12px] border flex flex-col items-center justify-center gap-0.5 disabled:cursor-not-allowed"
            style={{
              background: selected ? 'var(--accent)' : closed ? 'transparent' : 'var(--surface)',
              color: selected ? 'var(--accent-fg)' : closed ? 'var(--ink-3)' : 'var(--ink)',
              borderColor: selected ? 'var(--accent)' : closed ? 'transparent' : 'var(--line)',
            }}>
            <span className="text-xs font-medium" style={{ opacity: selected ? 0.85 : 0.7 }}>{i === 0 ? 'amanhã' : WEEKDAY_SHORT[dt.getDay()]}</span>
            <span className="t-num text-[22px] leading-6 font-semibold" style={{ fontStretch: 'var(--stretch-numeric)', opacity: closed ? 0.55 : 1 }}>{dt.getDate()}</span>
            <span className="text-[11px] leading-3" style={{ opacity: closed ? 0.8 : showMonth ? 0.7 : 0 }}>{closed ? 'fechado' : format(dt, 'MMM', { locale: ptBR }).replace('.', '')}</span>
          </button>
        )
      })}
    </div>
  )
}

function SlotGroups({ slots, value, onPick }: { slots: Slot[]; value: string; onPick: (s: string) => void }) {
  const groups: [string, Slot[]][] = [
    ['Manhã', slots.filter(s => toMinutes(s.start) < 12 * 60)],
    ['Tarde', slots.filter(s => toMinutes(s.start) >= 12 * 60 && toMinutes(s.start) < 18 * 60)],
    ['Noite', slots.filter(s => toMinutes(s.start) >= 18 * 60)],
  ]
  return (
    <div className="space-y-5">
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <div key={label}>
          <p className="text-13 text-ink-2 mb-2">{label}</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {list.map(s => {
              const taken = s.available === false
              const selected = value === s.start
              return (
                <button key={s.start} type="button" disabled={taken} onClick={() => onPick(s.start)}
                  aria-label={taken ? `${s.label}, ocupado` : s.label}
                  className="h-11 rounded-control border t-num text-sm font-semibold disabled:cursor-not-allowed"
                  style={{
                    background: selected ? 'var(--accent)' : taken ? 'transparent' : 'var(--surface)',
                    color: selected ? 'var(--accent-fg)' : taken ? 'var(--ink-3)' : 'var(--ink)',
                    borderColor: selected ? 'var(--accent)' : taken ? 'var(--line)' : 'var(--line-strong)',
                    textDecoration: taken ? 'line-through' : undefined,
                    opacity: taken ? 0.6 : 1,
                  }}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
