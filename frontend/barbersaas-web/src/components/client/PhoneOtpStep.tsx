import { useState, useEffect } from 'react'
import { ChevronLeft, ShieldAlert, Clock } from 'lucide-react'
import { publicApi, assetUrl } from '../../lib/api'
import { type ClientProfile } from '../../store/clientAuthStore'
import { Button } from '../ui/Button'
import { PhoneField } from '../ui/PhoneField'
import { OtpInput } from '../ui/OtpInput'
import { Avatar } from '../ui/Avatar'
import { COUNTRIES } from '../../lib/phone'
import { isValidBRPhone, formatPhoneBR, maskBRPhone } from '../../lib/masks'
import toast from 'react-hot-toast'
import { apiErrorMessage, apiErrorStatus } from '../../lib/apiError'

/* Cabeçalho do fluxo do cliente: a cara da barbearia (logo real quando existe). */
export function ClientFlowHeader({ title, subtitle, logoUrl, businessName, compact }: {
  title?: string; subtitle?: string; logoUrl?: string; businessName?: string; compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'mb-5' : 'mb-7'}`}>
      {!compact && (logoUrl
        ? <img src={assetUrl(logoUrl)} alt={businessName ?? 'Logo'} className="w-14 h-14 object-cover mb-4 rounded-[14px] border border-line" />
        : <Avatar name={businessName} size={56} className="mb-4 !rounded-[14px]" />)}
      <h1 className="t-display text-[24px] leading-7">{title ?? businessName ?? 'Minha conta'}</h1>
      {subtitle && <p className="text-sm text-ink-2 mt-1.5 max-w-[34ch]">{subtitle}</p>}
    </div>
  )
}

/* Contador "tempo para confirmar": só aparece com uma reserva de horário ativa. */
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
    <p className={`flex items-center justify-center gap-1.5 text-13 t-num ${low ? 'text-bad' : 'text-ink-2'}`}>
      <Clock size={14} />
      {secondsLeft > 0 ? <>Seu horário fica guardado por {mm}:{ss}</> : <>O tempo acabou. Escolha o horário de novo.</>}
    </p>
  )
}

/* ================= Telefone → código (Minha conta e Agendamento) ================= */
export function PhoneOtpStep({ slug, businessName, logoUrl, businessPhone, expiresAtUtc, phoneSubtitle, onVerified, compact }: {
  slug: string
  businessName?: string
  logoUrl?: string
  businessPhone?: string
  expiresAtUtc?: string
  phoneSubtitle?: string
  compact?: boolean
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
    if (!isValidBRPhone(phoneDigits)) { setPhoneError('Telefone inválido. Informe DDD e número.'); return }
    setPhoneError(null)
    setBusy(true)
    try {
      const res = (await publicApi.post('/client-auth/request-otp', { tenantSlug: slug, phone: fullPhone })).data.data
      if (res.devCode) toast.success(`Código (modo teste): ${res.devCode}`, { duration: 8000 })
      else toast.success('Enviamos o código por SMS.')
      setStage('otp'); setCode(''); setCodeError(false); setCooldown(59)
    } catch (e) {
      if (apiErrorStatus(e) === 403) setBlocked(apiErrorMessage(e, 'Seu cadastro está bloqueado nesta barbearia.'))
      else toast.error(apiErrorMessage(e, 'Não foi possível enviar o código.'))
    } finally { setBusy(false) }
  }

  const verify = async (otp: string) => {
    setBusy(true); setCodeError(false)
    try {
      const res = (await publicApi.post('/client-auth/verify-otp', { tenantSlug: slug, phone: fullPhone, code: otp })).data.data
      onVerified(res.accessToken, res.client, res.profileComplete)
    } catch (e) {
      if (apiErrorStatus(e) === 403) setBlocked(apiErrorMessage(e, 'Seu cadastro está bloqueado nesta barbearia.'))
      else { setCodeError(true); toast.error(apiErrorMessage(e, 'Código incorreto. Confira o SMS e tente de novo.')) }
    } finally { setBusy(false) }
  }

  if (blocked) {
    return (
      <div className="ds-panel ds-panel-pad text-center">
        <div className="w-11 h-11 rounded-full bg-bad-soft text-bad flex items-center justify-center mx-auto mb-3"><ShieldAlert size={20} /></div>
        <p className="text-md font-semibold">Não foi possível continuar</p>
        <p className="text-sm text-ink-2 mt-1">{blocked}</p>
        {businessPhone && <p className="text-sm text-ink-2 mt-3">Fale com a barbearia: <span className="t-num font-medium text-ink">{formatPhoneBR(businessPhone)}</span></p>}
        <Button variant="secondary" onClick={() => setBlocked(null)} className="mt-5"><ChevronLeft size={16} /> Voltar</Button>
      </div>
    )
  }

  if (stage === 'otp') {
    return (
      <div>
        <ClientFlowHeader compact={compact} logoUrl={logoUrl} businessName={businessName} title="Digite o código"
          subtitle={`Enviamos 6 números por SMS para ${COUNTRIES[0].dial} ${maskBRPhone(phoneDigits)}.`} />
        <div className="ds-panel ds-panel-pad space-y-5">
          <OtpInput value={code} onChange={setCode} onComplete={verify} error={codeError} />
          <Button size="lg" block onClick={() => verify(code)} loading={busy} disabled={code.length !== 6}>Confirmar</Button>
          <div className="flex items-center justify-between text-13">
            <button type="button" onClick={() => setStage('phone')} className="ds-link no-underline text-ink-2 font-medium">Trocar número</button>
            {cooldown > 0
              ? <span className="text-ink-3 t-num">Reenviar em {cooldown}s</span>
              : <button type="button" onClick={requestCode} className="ds-link">Reenviar código</button>}
          </div>
          {expiresAtUtc && <ReservationCountdown expiresAtUtc={expiresAtUtc} />}
        </div>
      </div>
    )
  }

  return (
    <div>
      <ClientFlowHeader compact={compact} logoUrl={logoUrl} businessName={businessName} title={compact ? 'Seu celular' : undefined}
        subtitle={phoneSubtitle ?? 'Confirme seu celular para continuar.'} />
      <div className="ds-panel ds-panel-pad space-y-4">
        <PhoneField label="Celular com DDD" value={phoneDigits} onChange={setPhoneDigits}
          error={phoneError ?? undefined} autoFocus onEnter={requestCode}
          hint="Enviamos um código por SMS. Sem senha para lembrar." />
        <Button size="lg" block onClick={requestCode} loading={busy}>Receber código</Button>
        {expiresAtUtc && <ReservationCountdown expiresAtUtc={expiresAtUtc} />}
      </div>
    </div>
  )
}
