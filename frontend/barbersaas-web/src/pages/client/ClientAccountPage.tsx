import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Scissors, ChevronLeft, LogOut, Calendar, Star, CheckCircle, ArrowRight, User, ShieldAlert } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
import { useClientAuthStore, type ClientProfile } from '../../store/clientAuthStore'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PhoneField, COUNTRIES } from '../../components/ui/PhoneField'
import { CpfField } from '../../components/ui/CpfField'
import { OtpInput } from '../../components/ui/OtpInput'
import { isValidBRPhone, isValidCPF } from '../../lib/masks'
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

function apiErrorMessage(e: any, fallback: string): string {
  if (e?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? fallback
}

export default function ClientAccountPage() {
  const { slug } = useParams<{ slug: string }>()
  const { token, client, setAuth, updateProfile, logout } = useClientAuthStore()
  const loggedIn = !!token

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
    enabled: loggedIn,
  })
  useEffect(() => {
    if (freshProfile) updateProfile(freshProfile)
  }, [freshProfile])

  const profileComplete = freshProfile?.profileComplete ?? false

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
        {!loggedIn && <PhoneStep slug={slug!} businessPhone={info?.phone}
          onVerified={(t, c, complete) => setAuth(t, c, complete, slug!)} />}
        {loggedIn && loadingProfile && (
          <div className="flex justify-center py-20"><div className="ds-shimmer w-8 h-8" style={{ borderRadius: '50%' }} /></div>
        )}
        {loggedIn && !loadingProfile && !profileComplete && client && (
          <CompleteProfileStep client={client} onDone={updateProfile} />
        )}
        {loggedIn && !loadingProfile && profileComplete && <Account name={client?.name} slug={slug!} />}
      </main>
    </div>
  )
}

/* ================= TELA 1+2 — Telefone -> OTP ================= */
function PhoneStep({ slug, businessPhone, onVerified }: {
  slug: string; businessPhone?: string
  onVerified: (token: string, client: ClientProfile, profileComplete: boolean) => void
}) {
  const [stage, setStage] = useState<'phone' | 'otp'>('phone')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const fullPhone = `${COUNTRIES[0].dial}${phoneDigits}`

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const requestCode = async () => {
    if (!isValidBRPhone(phoneDigits)) { setPhoneError('Telefone inválido. Informe DDD + número.'); return }
    setPhoneError(null)
    setBusy(true)
    try {
      const res = (await publicApi.post('/client-auth/request-otp', { tenantSlug: slug, phone: fullPhone })).data.data
      if (res.devCode) toast.success(`Código (modo teste): ${res.devCode}`, { duration: 8000 })
      else toast.success('Código enviado por SMS.')
      setStage('otp'); setCode(''); setCodeError(false); setCooldown(59)
    } catch (e: any) {
      if (e?.response?.status === 403) setBlocked(apiErrorMessage(e, 'Sua conta está bloqueada.'))
      else toast.error(apiErrorMessage(e, 'Erro ao enviar código.'))
    } finally { setBusy(false) }
  }

  const verify = async (otp: string) => {
    setBusy(true); setCodeError(false)
    try {
      const res = (await publicApi.post('/client-auth/verify-otp', { tenantSlug: slug, phone: fullPhone, code: otp })).data.data
      onVerified(res.accessToken, res.client, res.profileComplete)
      toast.success('Bem-vindo!')
    } catch (e: any) {
      if (e?.response?.status === 403) setBlocked(apiErrorMessage(e, 'Sua conta está bloqueada.'))
      else { setCodeError(true); toast.error(apiErrorMessage(e, 'Código inválido.')) }
    } finally { setBusy(false) }
  }

  if (blocked) {
    return (
      <div>
        <Header />
        <div className="ds-card text-center py-8 space-y-3 animate-fade-in">
          <ShieldAlert size={36} className="mx-auto" style={{ color: 'var(--color-error)' }} />
          <p className="ds-text-primary font-semibold">Conta bloqueada</p>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{blocked}</p>
          {businessPhone && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Contato: {businessPhone}</p>}
          <Button variant="ghost" onClick={() => setBlocked(null)} className="mt-2"><ChevronLeft size={15} /> Voltar</Button>
        </div>
      </div>
    )
  }

  if (stage === 'otp') {
    return (
      <div>
        <Header subtitle={`Enviamos um código para ${COUNTRIES[0].dial} ${phoneDigits}`} />
        <div className="ds-card space-y-5 animate-fade-in">
          <button onClick={() => setStage('phone')} className="flex items-center gap-1 transition-colors" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={15} /> Trocar telefone
          </button>
          <OtpInput value={code} onChange={setCode} onComplete={verify} error={codeError} />
          <Button onClick={() => verify(code)} loading={busy} disabled={code.length !== 6} className="w-full">
            {!busy && <CheckCircle size={16} />} Confirmar
          </Button>
          <p className="text-center ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            {cooldown > 0
              ? `Reenviar em ${cooldown}s`
              : <button onClick={requestCode} className="ds-text-accent font-medium hover:underline" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Reenviar código</button>}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header subtitle="Entre com seu telefone para ver seus agendamentos." />
      <div className="ds-card space-y-4 animate-fade-in">
        <PhoneField label="Telefone (WhatsApp)" value={phoneDigits} onChange={setPhoneDigits}
          error={phoneError ?? undefined} autoFocus onEnter={requestCode} />
        <Button onClick={requestCode} loading={busy} className="w-full">
          {!busy && <ArrowRight size={16} />} Continuar
        </Button>
      </div>
    </div>
  )
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
      <div className="w-14 h-14 flex items-center justify-center mb-4 animate-scale-in" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}><Scissors size={26} style={{ color: 'var(--bg-base)' }} /></div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>Minha conta</h1>
      {subtitle && <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)' }}>{subtitle}</p>}
    </div>
  )
}

/* ================= TELA 3 — Completar perfil (só dado faltando) ================= */
function CompleteProfileStep({ client, onDone }: { client: ClientProfile; onDone: (patch: Partial<ClientProfile>) => void }) {
  const needsName = !client.name?.trim()
  const needsCpf = !client.cpf?.trim()
  const [name, setName] = useState(client.name ?? '')
  const [cpfDigits, setCpfDigits] = useState('')
  const [email, setEmail] = useState(client.email ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const submit = async () => {
    let hasError = false
    if (needsName && !name.trim()) { setNameError('Informe seu nome.'); hasError = true } else setNameError(null)
    if (needsCpf && !isValidCPF(cpfDigits)) { setCpfError('CPF inválido.'); hasError = true } else setCpfError(null)
    if (hasError) return

    setBusy(true)
    try {
      await clientApi.put('/client/me', {
        name: needsName ? name.trim() : undefined,
        cpf: needsCpf ? cpfDigits : undefined,
        email: email.trim() || undefined,
      })
      onDone({
        name: needsName ? name.trim() : client.name,
        cpf: needsCpf ? cpfDigits : client.cpf,
        email: email.trim() || client.email,
      })
      toast.success('Perfil atualizado!')
    } catch (e: any) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar perfil.'))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <Header subtitle="Só falta completar seu cadastro." />
      <div className="ds-card space-y-4 animate-fade-in">
        {needsName && (
          <div className="ds-field">
            <label className="ds-label">Nome completo</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
              <input ref={nameRef} className={`ds-input pl-10 ${nameError ? 'ds-input-error' : ''}`} placeholder="Seu nome" value={name}
                onChange={e => setName(e.target.value)} />
            </div>
            {nameError && <span className="ds-error-text">{nameError}</span>}
          </div>
        )}
        {needsCpf && (
          <CpfField label="CPF" value={cpfDigits} onChange={setCpfDigits} error={cpfError ?? undefined} onEnter={submit} />
        )}
        <div className="ds-field">
          <label className="ds-label">E-mail (opcional)</label>
          <input type="email" className="ds-input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button onClick={submit} loading={busy} className="w-full">{!busy && <CheckCircle size={16} />} Concluir</Button>
      </div>
    </div>
  )
}

/* ================= TELA 4 — Conta logada ================= */
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
