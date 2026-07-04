import { useState, useEffect } from 'react'
import { Scissors, ChevronLeft, CheckCircle, ArrowRight, ShieldAlert, Clock } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { type ClientProfile } from '../../store/clientAuthStore'
import { Button } from '../ui/Button'
import { PhoneField, COUNTRIES } from '../ui/PhoneField'
import { OtpInput } from '../ui/OtpInput'
import { isValidBRPhone, formatPhoneBR } from '../../lib/masks'
import toast from 'react-hot-toast'

function apiErrorMessage(e: any, fallback: string): string {
  if (e?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? fallback
}

/* Cabeçalho com a cara da barbearia — logo real quando existe, ícone genérico
   só como fallback (antes mostrava sempre o ícone, mesmo com logo configurado). */
export function ClientFlowHeader({ subtitle, logoUrl, businessName }: {
  subtitle?: string; logoUrl?: string; businessName?: string
}) {
  return (
    <div className="flex flex-col items-center text-center mb-8 animate-slide-up">
      {logoUrl ? (
        <img src={logoUrl} alt={businessName ?? 'Logo'} className="w-14 h-14 object-cover mb-4 animate-scale-in"
          style={{ borderRadius: 'var(--radius-lg)', border: '2px solid var(--accent-soft)' }} />
      ) : (
        <div className="w-14 h-14 flex items-center justify-center mb-4 animate-scale-in" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}>
          <Scissors size={26} style={{ color: 'var(--bg-base)' }} />
        </div>
      )}
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
        {businessName ?? 'Minha conta'}
      </h1>
      {subtitle && <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)' }}>{subtitle}</p>}
    </div>
  )
}

/* Contador "tempo pra confirmar" — só aparece quando há uma reserva de slot
   ativa por trás (fluxo de agendamento). Na área "Minha conta" (sem reserva),
   expiresAtUtc não é passado e isto não renderiza nada. */
function ReservationCountdown({ expiresAtUtc }: { expiresAtUtc: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.floor((new Date(expiresAtUtc).getTime() - Date.now()) / 1000)))

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAtUtc).getTime() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAtUtc])

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0')
  const ss = (secondsLeft % 60).toString().padStart(2, '0')
  const low = secondsLeft <= 60

  return (
    <div className="flex items-center justify-center gap-1.5" style={{ fontSize: 'var(--text-xs)', color: low ? 'var(--color-error)' : 'var(--text-disabled)' }}>
      <Clock size={13} />
      {secondsLeft > 0 ? <>Seu horário fica reservado por mais {mm}:{ss}</> : <>Tempo esgotado — escolha o horário de novo.</>}
    </div>
  )
}

/* ================= Telefone -> OTP (compartilhado: Minha conta e Agendamento) ================= */
export function PhoneOtpStep({ slug, businessName, logoUrl, businessPhone, expiresAtUtc, phoneSubtitle, onVerified }: {
  slug: string
  businessName?: string
  logoUrl?: string
  businessPhone?: string
  expiresAtUtc?: string
  phoneSubtitle?: string
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
        <ClientFlowHeader logoUrl={logoUrl} businessName={businessName} />
        <div className="ds-card-glass text-center py-8 space-y-3 animate-fade-in">
          <ShieldAlert size={36} className="mx-auto" style={{ color: 'var(--color-error)' }} />
          <p className="ds-text-primary font-semibold">Conta bloqueada</p>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{blocked}</p>
          {businessPhone && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Contato: {formatPhoneBR(businessPhone)}</p>}
          <Button variant="ghost" onClick={() => setBlocked(null)} className="mt-2"><ChevronLeft size={15} /> Voltar</Button>
        </div>
      </div>
    )
  }

  if (stage === 'otp') {
    return (
      <div>
        <ClientFlowHeader logoUrl={logoUrl} businessName={businessName} subtitle={`Enviamos um código para ${COUNTRIES[0].dial} ${phoneDigits}`} />
        <div className="ds-card-glass space-y-5 animate-fade-in">
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
          {expiresAtUtc && <ReservationCountdown expiresAtUtc={expiresAtUtc} />}
        </div>
      </div>
    )
  }

  return (
    <div>
      <ClientFlowHeader logoUrl={logoUrl} businessName={businessName} subtitle={phoneSubtitle ?? 'Confirme seu telefone para continuar.'} />
      <div className="ds-card-glass space-y-4 animate-fade-in">
        <PhoneField label="Telefone (WhatsApp)" value={phoneDigits} onChange={setPhoneDigits}
          error={phoneError ?? undefined} autoFocus onEnter={requestCode} />
        <Button onClick={requestCode} loading={busy} className="w-full">
          {!busy && <ArrowRight size={16} />} Continuar
        </Button>
        {expiresAtUtc && <ReservationCountdown expiresAtUtc={expiresAtUtc} />}
      </div>
    </div>
  )
}
