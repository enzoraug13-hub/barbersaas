import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Scissors, Phone, ChevronLeft, LogOut, Calendar, Star, CheckCircle, ArrowRight, User, IdCard, ShieldAlert } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
import { useClientAuthStore } from '../../store/clientAuthStore'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel: Record<string, string> = {
  Pending: 'Pendente', Confirmed: 'Confirmado', Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu',
}
const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  Pending: 'warning', Confirmed: 'info', Completed: 'success', Cancelled: 'error', NoShow: 'error',
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <header className="h-16 flex items-center justify-between px-4 max-w-lg w-full mx-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link to={`/b/${slug}`} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          <ChevronLeft size={16} /> {info?.businessName ?? 'Voltar'}
        </Link>
        {loggedIn && (
          <button onClick={logout} className="flex items-center gap-1.5 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={15} /> Sair
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {loggedIn
          ? <Account name={client?.name} slug={slug!} />
          : <Login slug={slug!} businessPhone={info?.phone} onAuth={(t, c) => setAuth(t, c, slug!)} />}
      </main>
    </div>
  )
}

function apiErrorMessage(e: any, fallback: string): string {
  if (e?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? fallback
}

/* ---------------- Login / Cadastro por OTP ---------------- */
function Login({ slug, businessPhone, onAuth }: { slug: string; businessPhone?: string; onAuth: (token: string, client: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)

  const switchMode = (next: 'login' | 'register') => {
    setMode(next); setStep('form'); setCode(''); setBlocked(null)
  }

  const requestCode = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) { toast.error('Use o formato internacional, ex: +5511999999999.'); return }
    if (mode === 'register') {
      if (!name.trim()) { toast.error('Informe seu nome.'); return }
      if (!/^\d{11}$/.test(cpf.replace(/\D/g, ''))) { toast.error('CPF inválido. Informe os 11 dígitos.'); return }
    }
    setBusy(true)
    try {
      const endpoint = mode === 'login' ? '/client-auth/login/request-otp' : '/client-auth/register/request-otp'
      const payload = mode === 'login'
        ? { tenantSlug: slug, phone: phone.trim() }
        : { tenantSlug: slug, phone: phone.trim(), name: name.trim(), cpf: cpf.replace(/\D/g, '') }
      const res = (await publicApi.post(endpoint, payload)).data.data
      if (res.devCode) toast.success(`Código (modo teste): ${res.devCode}`, { duration: 8000 })
      else toast.success('Código enviado por SMS.')
      setStep('code')
    } catch (e: any) {
      if (e?.response?.status === 403) setBlocked(apiErrorMessage(e, 'Sua conta está bloqueada.'))
      else toast.error(apiErrorMessage(e, 'Erro ao enviar código.'))
    } finally { setBusy(false) }
  }

  const verify = async () => {
    if (code.trim().length !== 6) { toast.error('O código tem 6 dígitos.'); return }
    setBusy(true)
    try {
      const res = (await publicApi.post('/client-auth/verify-otp', { tenantSlug: slug, phone: phone.trim(), code: code.trim() })).data.data
      onAuth(res.accessToken, res.client)
      toast.success('Bem-vindo!')
    } catch (e: any) {
      if (e?.response?.status === 403) setBlocked(apiErrorMessage(e, 'Sua conta está bloqueada.'))
      else toast.error(apiErrorMessage(e, 'Código inválido.'))
    } finally { setBusy(false) }
  }

  if (blocked) {
    return (
      <div>
        <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
          <div className="w-14 h-14 flex items-center justify-center mb-4 animate-scale-in" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}><Scissors size={26} style={{ color: 'var(--bg-base)' }} /></div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>Minha conta</h1>
        </div>
        <div className="ds-card text-center py-8 space-y-3 animate-fade-in">
          <ShieldAlert size={36} className="mx-auto" style={{ color: 'var(--color-error)' }} />
          <p className="ds-text-primary font-semibold">Conta bloqueada</p>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{blocked}</p>
          {businessPhone && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Contato: {businessPhone}</p>}
          <Button variant="ghost" onClick={() => setBlocked(null)} className="mt-2">
            <ChevronLeft size={15} /> Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
        <div className="w-14 h-14 flex items-center justify-center mb-4 animate-scale-in" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}><Scissors size={26} style={{ color: 'var(--bg-base)' }} /></div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>Minha conta</h1>
        <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)' }}>
          {mode === 'login' ? 'Entre com seu telefone para ver seus agendamentos.' : 'Crie sua conta para acompanhar seus agendamentos.'}
        </p>
      </div>

      <div key={`${mode}-${step}`} className="ds-card space-y-4 animate-fade-in">
        {step === 'form' ? (
          <>
            {mode === 'register' && (
              <div className="ds-field">
                <label className="ds-label">Nome</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                  <input className="ds-input pl-10" placeholder="Seu nome" value={name}
                    onChange={e => setName(e.target.value)} autoFocus />
                </div>
              </div>
            )}
            <div className="ds-field">
              <label className="ds-label">Telefone (WhatsApp)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                <input className="ds-input pl-10" type="tel" placeholder="+5511999999999" value={phone}
                  onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestCode()}
                  autoFocus={mode === 'login'} />
              </div>
            </div>
            {mode === 'register' && (
              <div className="ds-field">
                <label className="ds-label">CPF</label>
                <div className="relative">
                  <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
                  <input className="ds-input pl-10" inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={cpf}
                    onChange={e => setCpf(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestCode()} />
                </div>
              </div>
            )}
            <Button onClick={requestCode} loading={busy} className="w-full">
              {!busy && <ArrowRight size={16} />}
              {mode === 'login' ? 'Enviar código' : 'Criar conta'}
            </Button>
            <p className="text-center ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
              {mode === 'login' ? (
                <>Primeira vez? <button onClick={() => switchMode('register')} className="ds-text-accent font-medium hover:underline" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Criar conta</button></>
              ) : (
                <>Já tem conta? <button onClick={() => switchMode('login')} className="ds-text-accent font-medium hover:underline" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Entrar</button></>
              )}
            </p>
          </>
        ) : (
          <>
            <button onClick={() => setStep('form')} className="flex items-center gap-1 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <ChevronLeft size={15} /> Voltar
            </button>
            <div className="ds-field">
              <label className="ds-label">Código de 6 dígitos</label>
              <input className="ds-input text-center font-semibold" style={{ fontSize: 'var(--text-lg)', letterSpacing: '0.4em' }} inputMode="numeric" maxLength={6}
                placeholder="••••••" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verify()} autoFocus />
            </div>
            <Button onClick={verify} loading={busy} className="w-full">{!busy && <CheckCircle size={16} />} Entrar</Button>
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
          <div className="ds-card text-center py-10 animate-fade-in">
            <Calendar size={36} className="mx-auto mb-3" style={{ color: 'var(--text-disabled)' }} />
            <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Você ainda não tem agendamentos.</p>
            <Link to={`/b/${slug}`}><Button className="mt-5"><Calendar size={15} /> Agendar agora</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appts.map((a, i) => (
              <div key={a.id} style={{ animationDelay: `${i * 50}ms` }} className="ds-card ds-card-interactive flex items-center gap-4 animate-slide-up">
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
