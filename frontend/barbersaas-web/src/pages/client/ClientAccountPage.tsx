import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Scissors, Loader2, Phone, ChevronLeft, LogOut, Calendar, Star, CheckCircle, ArrowRight } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
import { useClientAuthStore } from '../../store/clientAuthStore'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel: Record<string, string> = {
  Pending: 'Pendente', Confirmed: 'Confirmado', Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu',
}
const statusBadge: Record<string, string> = {
  Pending: 'badge-pending', Confirmed: 'badge-confirmed', Completed: 'badge-completed', Cancelled: 'badge-cancelled', NoShow: 'badge-cancelled',
}

export default function ClientAccountPage() {
  const { slug } = useParams<{ slug: string }>()
  const { token, client, setAuth, logout } = useClientAuthStore()
  const loggedIn = !!token

  const { data: info } = useQuery({
    queryKey: ['public-info', slug],
    queryFn: async () => (await publicApi.get(`/public/${slug}`)).data.data,
    enabled: !!slug,
  })
  useEffect(() => { if (info) applyTenantTheme(info) }, [info])

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 max-w-lg w-full mx-auto">
        <Link to={`/b/${slug}`} className="flex items-center gap-1.5 text-muted hover:text-content text-sm transition-colors">
          <ChevronLeft size={16} /> {info?.businessName ?? 'Voltar'}
        </Link>
        {loggedIn && (
          <button onClick={logout} className="flex items-center gap-1.5 text-muted hover:text-danger text-sm transition-colors">
            <LogOut size={15} /> Sair
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {loggedIn
          ? <Account name={client?.name} slug={slug!} />
          : <Login slug={slug!} onAuth={(t, c) => setAuth(t, c, slug!)} />}
      </main>
    </div>
  )
}

/* ---------------- Login por OTP ---------------- */
function Login({ slug, onAuth }: { slug: string; onAuth: (token: string, client: any) => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const requestCode = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) { toast.error('Use o formato internacional, ex: +5511999999999.'); return }
    setBusy(true)
    try {
      const res = (await publicApi.post('/client-auth/request-otp', { tenantSlug: slug, phone: phone.trim() })).data.data
      if (res.devCode) toast.success(`Código (modo teste): ${res.devCode}`, { duration: 8000 })
      else toast.success('Código enviado por SMS.')
      setStep('code')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erro ao enviar código.') }
    finally { setBusy(false) }
  }

  const verify = async () => {
    if (code.trim().length !== 6) { toast.error('O código tem 6 dígitos.'); return }
    setBusy(true)
    try {
      const res = (await publicApi.post('/client-auth/verify-otp', { tenantSlug: slug, phone: phone.trim(), code: code.trim(), name: name.trim() || undefined })).data.data
      onAuth(res.accessToken, res.client)
      toast.success('Bem-vindo!')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Código inválido.') }
    finally { setBusy(false) }
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
        <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4 animate-scale-in"><Scissors size={26} className="text-accentFg" /></div>
        <h1 className="text-xl font-bold text-content">Minha conta</h1>
        <p className="text-muted text-sm mt-1">Entre com seu telefone para ver seus agendamentos.</p>
      </div>

      <div key={step} className="card space-y-4 animate-fade-in">
        {step === 'phone' ? (
          <>
            <div>
              <label className="label">Telefone (WhatsApp)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input className="input pl-10" type="tel" placeholder="+5511999999999" value={phone}
                  onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestCode()} autoFocus />
              </div>
            </div>
            <button onClick={requestCode} disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Enviar código
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-muted hover:text-content text-sm transition-colors">
              <ChevronLeft size={15} /> Trocar telefone
            </button>
            <div>
              <label className="label">Código de 6 dígitos</label>
              <input className="input text-center text-lg tracking-[0.4em] font-semibold" inputMode="numeric" maxLength={6}
                placeholder="••••••" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verify()} autoFocus />
            </div>
            <div>
              <label className="label">Seu nome <span className="text-subtle font-normal">(se for o primeiro acesso)</span></label>
              <input className="input" placeholder="Como quer ser chamado" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <button onClick={verify} disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Entrar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------------- Conta logada ---------------- */
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
      <div className="card flex items-center gap-4 animate-slide-up">
        <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xl font-bold flex-shrink-0">
          {(me?.name || name || '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-content text-lg truncate">{me?.name || name || 'Cliente'}</p>
          <p className="text-sm text-muted">{me?.phone}</p>
        </div>
        <div className="ml-auto text-right flex-shrink-0">
          <div className="flex items-center gap-1 text-accent font-bold"><Star size={15} /> {me?.loyaltyPoints ?? 0}</div>
          <p className="text-xs text-subtle">{me?.totalVisits ?? 0} visitas</p>
        </div>
      </div>

      {/* Agendamentos */}
      <div>
        <h2 className="text-sm font-semibold text-muted mb-3 px-1">Meus agendamentos</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card flex items-center gap-4">
                <div className="skeleton w-14 h-12 flex-shrink-0" />
                <div className="flex-1 space-y-2.5"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
                <div className="skeleton h-6 w-16 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : !appts?.length ? (
          <div className="card text-center py-10 animate-fade-in">
            <Calendar size={36} className="mx-auto text-subtle mb-3" />
            <p className="text-muted text-sm">Você ainda não tem agendamentos.</p>
            <Link to={`/b/${slug}`} className="btn-primary mt-5 inline-flex"><Calendar size={15} /> Agendar agora</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appts.map((a, i) => (
              <div key={a.id} style={{ animationDelay: `${i * 50}ms` }} className="card flex items-center gap-4 animate-slide-up transition-colors hover:border-accent/40">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-xs text-subtle capitalize">{format(parseISO(a.date), 'MMM', { locale: ptBR })}</p>
                  <p className="text-xl font-bold text-content leading-none">{format(parseISO(a.date), 'dd')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content truncate">{a.service}</p>
                  <p className="text-sm text-muted">{a.barber} · {a.startTime?.slice(0, 5)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={statusBadge[a.status] ?? 'badge-pending'}>{statusLabel[a.status] ?? a.status}</span>
                  <p className="text-sm font-semibold text-content mt-1.5">{fmt(a.finalPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
