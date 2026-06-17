import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Scissors, CheckCircle, Loader2, ChevronLeft, Clock, DollarSign, Phone, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../../lib/api'
import { usePublicBarbers } from '../../features/barbers/barbersApi'
import { usePublicServices } from '../../features/services/servicesApi'
import { useAvailableSlots, useCreateAppointment } from '../../features/appointments/appointmentsApi'
import { applyTenantTheme } from '../../lib/theme-tenant'
import type { TenantPublicInfo, Barber, Service } from '../../types'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Step = 'barber' | 'service' | 'date' | 'slots' | 'client' | 'confirm' | 'done'

/* ---- Estados de carregamento (skeleton com shimmer) ---- */
const ListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="card flex items-center gap-4">
        <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
)
const GridSkeleton = ({ cells = 9, h = 'h-12' }: { cells?: number; h?: string }) => (
  <div className="grid grid-cols-3 gap-2">
    {Array.from({ length: cells }).map((_, i) => <div key={i} className={`skeleton ${h}`} />)}
  </div>
)

/* ---- Estado vazio (ícone + texto) ---- */
const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="card text-center py-10 animate-fade-in">
    <Icon size={34} className="mx-auto text-subtle mb-3" />
    <p className="text-muted text-sm">{text}</p>
  </div>
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
    <div className="min-h-screen bg-app flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-accent" />
    </div>
  )

  return (
    <div className="min-h-screen bg-app">
      {/* Header */}
      <div className="relative h-48"
        style={{ background: `linear-gradient(to bottom, ${info.primaryColor || '#1a1a1a'}, rgb(var(--bg)))` }}>
        <Link to={`/b/${slug}/conta`}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-3 py-1.5 text-xs font-medium text-white hover:bg-black/60 transition-colors">
          <User size={14} /> Minha conta
        </Link>
        {info.coverImageUrl && (
          <img src={info.coverImageUrl} alt="capa" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {info.logoUrl ? (
            <img src={info.logoUrl} alt="logo" className="w-16 h-16 rounded-2xl object-cover mb-2 border-2 border-accent/50" />
          ) : (
            <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-2">
              <Scissors size={28} className="text-accentFg" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-content">{info.businessName}</h1>
          {info.city && <p className="text-muted text-sm">{info.city}</p>}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress */}
        {step !== 'done' && (
          <div className="flex items-center gap-1 mb-6">
            {(['barber','service','date','slots','client','confirm'] as Step[]).map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
                ['barber','service','date','slots','client','confirm'].indexOf(step) >= i
                  ? 'bg-accent' : 'bg-surfaceHover'
              }`} />
            ))}
          </div>
        )}

        <div key={step} className="animate-fade-in">
        {/* Step: Barbeiro */}
        {step === 'barber' && (
          <div>
            <h2 className="text-lg font-bold text-content mb-4">Escolha o profissional</h2>
            {loadBarbers ? <ListSkeleton />
            : !barbers?.length ? <EmptyState icon={User} text="Nenhum profissional disponível no momento." />
            : (
              <div className="space-y-3">
                {barbers.map((b, i) => (
                  <button key={b.id} onClick={() => { setBarber(b); setStep('service') }}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className="w-full card card-tap text-left flex items-center gap-4 animate-slide-up min-h-[64px]">
                    {b.photoUrl
                      ? <img src={b.photoUrl} alt={b.name} className="w-12 h-12 rounded-full object-cover" />
                      : <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">{b.name[0]}</div>
                    }
                    <div>
                      <p className="font-semibold text-content">{b.name}</p>
                      {b.bio && <p className="text-xs text-muted mt-0.5 line-clamp-1">{b.bio}</p>}
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
            <button onClick={back} className="flex items-center gap-1 text-muted hover:text-content text-sm mb-4 transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-lg font-bold text-content mb-4">Escolha o serviço</h2>
            {loadServices ? <ListSkeleton />
            : !services?.length ? <EmptyState icon={Scissors} text="Nenhum serviço disponível no momento." />
            : (
              <div className="space-y-3">
                {services.map((s, i) => (
                  <button key={s.id} onClick={() => { setService(s); setStep('date') }}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className="w-full card card-tap text-left flex items-center gap-4 animate-slide-up min-h-[64px]">
                    <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: s.colorHex ?? '#c9a84c' }} />
                    <div className="flex-1">
                      <p className="font-semibold text-content">{s.name}</p>
                      {s.description && <p className="text-xs text-muted mt-0.5">{s.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-accent font-semibold text-sm"><DollarSign size={13} />R$ {s.price.toFixed(2)}</div>
                      <div className="flex items-center gap-1 text-subtle text-xs mt-0.5"><Clock size={11} />{s.durationMinutes} min</div>
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
            <button onClick={back} className="flex items-center gap-1 text-muted hover:text-content text-sm mb-4 transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-lg font-bold text-content mb-4">Escolha a data</h2>
            <div className="grid grid-cols-2 gap-3">
              {nextDates.map((d, i) => (
                <button key={d.value} onClick={() => { setDate(d.value); setStep('slots') }}
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`card card-tap text-center py-4 capitalize animate-slide-up min-h-[56px] ${date === d.value ? 'border-accent bg-accent/10' : ''}`}>
                  <p className="text-content font-medium">{d.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Horários */}
        {step === 'slots' && (
          <div>
            <button onClick={back} className="flex items-center gap-1 text-muted hover:text-content text-sm mb-4 transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-lg font-bold text-content mb-4">Escolha o horário</h2>
            {loadSlots ? <GridSkeleton cells={9} h="h-12" />
            : !slots?.length ? <EmptyState icon={Clock} text="Nenhum horário disponível neste dia. Tente outra data." />
            : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s, i) => (
                  <button key={s.start} onClick={() => { setSlot(s.start); setStep('client') }}
                    style={{ animationDelay: `${i * 20}ms` }}
                    className={`card card-tap text-center py-3 text-sm font-medium animate-slide-up min-h-[44px] ${slot === s.start ? 'border-accent bg-accent/10 text-accent' : 'text-content'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Dados do cliente */}
        {step === 'client' && (
          <div>
            <button onClick={back} className="flex items-center gap-1 text-muted hover:text-content text-sm mb-4 transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-lg font-bold text-content mb-4">Seus dados</h2>
            <div className="card space-y-4">
              <div><label className="label">Nome completo</label><input className="input" placeholder="João Silva" value={client.name} onChange={e => setClient(c => ({...c, name: e.target.value}))} required /></div>
              <div>
                <label className="label">WhatsApp</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                  <input type="tel" className="input pl-10" placeholder="+5511999999999" value={client.phone} onChange={e => setClient(c => ({...c, phone: e.target.value}))} required />
                </div>
              </div>
              <div><label className="label">E-mail (opcional)</label><input type="email" className="input" placeholder="joao@email.com" value={client.email} onChange={e => setClient(c => ({...c, email: e.target.value}))} /></div>
              <button
                onClick={() => {
                  if (!client.name.trim()) { toast.error('Informe seu nome completo.'); return }
                  if (!/^\+[1-9]\d{7,14}$/.test(client.phone.trim())) {
                    toast.error('WhatsApp inválido. Use o formato internacional, ex: +5511999999999.')
                    return
                  }
                  setStep('confirm')
                }}
                className="btn-primary w-full">Continuar</button>
            </div>
          </div>
        )}

        {/* Step: Confirmação */}
        {step === 'confirm' && (
          <div>
            <button onClick={back} className="flex items-center gap-1 text-muted hover:text-content text-sm mb-4 transition-colors">
              <ChevronLeft size={16} /> Voltar
            </button>
            <h2 className="text-lg font-bold text-content mb-4">Confirme seu agendamento</h2>
            <div className="card space-y-3 mb-4">
              {[
                { label: 'Profissional', value: barber?.name },
                { label: 'Serviço',      value: service?.name },
                { label: 'Data',         value: date },
                { label: 'Horário',      value: slot },
                { label: 'Valor',        value: `R$ ${service?.price.toFixed(2)}` },
                { label: 'Nome',         value: client.name },
                { label: 'Telefone',     value: client.phone },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-muted">{r.label}</span>
                  <span className="text-content font-medium">{r.value}</span>
                </div>
              ))}
            </div>
            <button onClick={handleBook} disabled={createAppt.isPending} className="btn-primary w-full text-base py-4">
              {createAppt.isPending ? <Loader2 size={20} className="animate-spin" /> : null}
              {createAppt.isPending ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        )}

        {/* Step: Concluído */}
        {step === 'done' && (
          <div className="text-center py-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <span className="absolute inset-0 rounded-full bg-success/20 animate-ping" style={{ animationIterationCount: 2 }} />
              <div className="relative w-20 h-20 bg-success/20 rounded-full flex items-center justify-center animate-scale-in">
                <CheckCircle size={40} className="text-success" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-content mb-2 animate-slide-up">Agendado!</h2>
            <p className="text-muted mb-6 animate-slide-up" style={{ animationDelay: '60ms' }}>Seu agendamento foi confirmado. Até lá!</p>
            {result && (
              <div className="card text-left space-y-2 mb-6">
                <p className="text-sm text-muted">Barbeiro: <span className="text-content">{result.barberName}</span></p>
                <p className="text-sm text-muted">Serviço: <span className="text-content">{result.serviceName}</span></p>
                <p className="text-sm text-muted">Data: <span className="text-content">{result.date} às {result.startTime}</span></p>
              </div>
            )}
            <button onClick={() => { setStep('barber'); setBarber(null); setService(null); setDate(''); setSlot(''); setClient({ name: '', phone: '', email: '' }) }}
              className="btn-secondary">Novo agendamento</button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
