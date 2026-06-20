import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Scissors, CheckCircle, Loader2, ChevronLeft, Clock, DollarSign, Phone, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../../lib/api'
import { usePublicBarbers } from '../../features/barbers/barbersApi'
import { usePublicServices } from '../../features/services/servicesApi'
import { useAvailableSlots, useCreateAppointment } from '../../features/appointments/appointmentsApi'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import type { TenantPublicInfo, Barber, Service } from '../../types'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Step = 'barber' | 'service' | 'date' | 'slots' | 'client' | 'confirm' | 'done'

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
const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
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
  const [step, setStep]         = useState<Step>('barber')
  const [barber, setBarber]     = useState<Barber | null>(null)
  const [service, setService]   = useState<Service | null>(null)
  const [date, setDate]         = useState('')
  const [slot, setSlot]         = useState('')
  const [client, setClient]     = useState({ name: '', phone: '', email: '' })
  const [result, setResult]     = useState<any>(null)

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
  const { data: services, isLoading: loadServices } = usePublicServices(slug!)
  const { data: slots,    isLoading: loadSlots }    = useAvailableSlots(slug!, barber?.id ?? '', service?.id ?? '', date)
  const createAppt = useCreateAppointment(slug!)

  const nextDates = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i + 1)
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEE, dd MMM", { locale: ptBR }) }
  })

  const handleBook = async () => {
    try {
      const res = await createAppt.mutateAsync({
        barberId: barber!.id, serviceId: service!.id,
        clientName: client.name, clientPhone: client.phone, clientEmail: client.email || undefined,
        date, startTime: slot
      })
      setResult(res); setStep('done')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao agendar.')
    }
  }

  const back = () => {
    const steps: Step[] = ['barber','service','date','slots','client','confirm']
    const i = steps.indexOf(step as any)
    if (i > 0) setStep(steps[i - 1])
  }


  if (!info) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="relative h-48"
        style={{ background: `linear-gradient(to bottom, ${info.primaryColor || '#1a1a1a'}, var(--bg-base))` }}>
        <Link to={`/b/${slug}/conta`}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 transition-colors"
          style={{ borderRadius: 'var(--radius-full)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '6px var(--space-3)', fontSize: 'var(--text-xs)', fontWeight: 500, color: '#fff' }}>
          <User size={14} /> Minha conta
        </Link>
        {info.coverImageUrl && (
          <img src={info.coverImageUrl} alt="capa" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {info.logoUrl ? (
            <img src={info.logoUrl} alt="logo" className="w-16 h-16 object-cover mb-2" style={{ borderRadius: 'var(--radius-lg)', border: '2px solid var(--accent-soft)' }} />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center mb-2" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}>
              <Scissors size={28} style={{ color: 'var(--bg-base)' }} />
            </div>
          )}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-2xl)', color: 'var(--text-primary)' }}>{info.businessName}</h1>
          {info.city && <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{info.city}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress — stepper visual */}
        {step !== 'done' && (
          <div className="flex items-center gap-1 mb-6">
            {(['barber','service','date','slots','client','confirm'] as Step[]).map((s) => (
              <div key={s} className="h-1 flex-1 transition-all" style={{
                borderRadius: 'var(--radius-full)',
                background: ['barber','service','date','slots','client','confirm'].indexOf(step) >= ['barber','service','date','slots','client','confirm'].indexOf(s)
                  ? 'var(--tenant-primary)' : 'var(--bg-elevated)',
              }} />
            ))}
          </div>
        )}

        <div key={step} className="animate-fade-in">
        {/* Step: Barbeiro */}
        {step === 'barber' && (
          <div>
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
                      ? <img src={b.photoUrl} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
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

        {/* Step: Serviço */}
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
                      <div className="ds-text-accent flex items-center gap-1 font-semibold" style={{ fontSize: 'var(--text-sm)' }}><DollarSign size={13} />R$ {s.price.toFixed(2)}</div>
                      <div className="ds-text-disabled flex items-center gap-1 mt-0.5" style={{ fontSize: 'var(--text-xs)' }}><Clock size={11} />{s.durationMinutes} min</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Data */}
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

        {/* Step: Horários */}
        {step === 'slots' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Escolha o horário</h2>
            {loadSlots ? <GridSkeleton cells={9} h="h-12" />
            : !slots?.length ? <EmptyState icon={Clock} text="Nenhum horário disponível neste dia. Tente outra data." />
            : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s, i) => (
                  <button key={s.start} onClick={() => { setSlot(s.start); setStep('client') }}
                    style={{
                      animationDelay: `${i * 20}ms`, minHeight: 44,
                      borderColor: slot === s.start ? 'var(--accent)' : undefined,
                      background: slot === s.start ? 'var(--accent-soft)' : undefined,
                      color: slot === s.start ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                    className="ds-card ds-card-interactive text-center font-medium animate-slide-up" >
                    <span style={{ fontSize: 'var(--text-sm)' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Dados do cliente */}
        {step === 'client' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Seus dados</h2>
            <div className="ds-card space-y-4">
              <div className="ds-field"><label className="ds-label">Nome completo</label><input className="ds-input" placeholder="João Silva" value={client.name} onChange={e => setClient(c => ({...c, name: e.target.value}))} required /></div>
              <div className="ds-field">
                <label className="ds-label">WhatsApp</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                  <input type="tel" className="ds-input pl-10" placeholder="+5511999999999" value={client.phone} onChange={e => setClient(c => ({...c, phone: e.target.value}))} required />
                </div>
              </div>
              <div className="ds-field"><label className="ds-label">E-mail (opcional)</label><input type="email" className="ds-input" placeholder="joao@email.com" value={client.email} onChange={e => setClient(c => ({...c, email: e.target.value}))} /></div>
              <Button
                onClick={() => {
                  if (!client.name.trim()) { toast.error('Informe seu nome completo.'); return }
                  if (!/^\+[1-9]\d{7,14}$/.test(client.phone.trim())) {
                    toast.error('WhatsApp inválido. Use o formato internacional, ex: +5511999999999.')
                    return
                  }
                  setStep('confirm')
                }}
                className="w-full">Continuar</Button>
            </div>
          </div>
        )}

        {/* Step: Confirmação */}
        {step === 'confirm' && (
          <div>
            <BackButton onClick={back} />
            <h2 className="ds-section-title mb-4" style={{ fontSize: 'var(--text-lg)' }}>Confirme seu agendamento</h2>
            <div className="ds-card space-y-3 mb-4">
              {[
                { label: 'Profissional', value: barber?.name },
                { label: 'Serviço',      value: service?.name },
                { label: 'Data',         value: date },
                { label: 'Horário',      value: slot },
                { label: 'Valor',        value: `R$ ${service?.price.toFixed(2)}` },
                { label: 'Nome',         value: client.name },
                { label: 'Telefone',     value: client.phone },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 last:border-0" style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="ds-text-secondary">{r.label}</span>
                  <span className="ds-text-primary font-medium">{r.value}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleBook} loading={createAppt.isPending} className="w-full" style={{ height: 52, fontSize: 'var(--text-base)' }}>
              {createAppt.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
            </Button>
          </div>
        )}

        {/* Step: Concluído */}
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
            <Button variant="ghost" onClick={() => { setStep('barber'); setBarber(null); setService(null); setDate(''); setSlot(''); setClient({ name: '', phone: '', email: '' }) }}>
              Novo agendamento
            </Button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
