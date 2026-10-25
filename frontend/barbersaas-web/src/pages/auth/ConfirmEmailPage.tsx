import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck, MailX } from 'lucide-react'
import { useConfirmEmail } from '../../features/auth/authApi'
import { btnClass } from '../../components/ui/btnClass'
import { AuthLayout } from './AuthLayout'

// Destino do link enviado por e-mail no cadastro: /confirmar-email?token=...
export default function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { mutateAsync: confirm } = useConfirmEmail()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error')
  const fired = useRef(false)

  useEffect(() => {
    document.title = 'Confirmar e-mail | Trimly'
    if (!token || fired.current) return
    fired.current = true // StrictMode monta 2x e o token é de uso único
    confirm(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [token, confirm])

  return (
    <AuthLayout>
      {status === 'loading' && (
        <div aria-live="polite">
          <span className="ds-spinner inline-block" style={{ width: 28, height: 28, color: 'var(--accent-ink)' }} aria-hidden />
          <h1 className="t-display text-[28px] leading-8 mt-5">Confirmando seu e-mail</h1>
          <p className="text-sm text-ink-2 mt-1.5">Só um instante.</p>
        </div>
      )}
      {status === 'ok' && (
        <div>
          <span className="w-12 h-12 rounded-full bg-ok-soft text-ok-solid flex items-center justify-center"><MailCheck size={22} /></span>
          <h1 className="t-display text-[28px] leading-8 mt-5">E-mail confirmado</h1>
          <p className="text-sm text-ink-2 mt-1.5">Sua conta está ativa. Entre com o e-mail e a senha que você cadastrou.</p>
          <Link to="/login" className={btnClass('primary', 'lg', 'w-full mt-7')}>Entrar</Link>
        </div>
      )}
      {status === 'error' && (
        <div>
          <span className="w-12 h-12 rounded-full bg-bad-soft text-bad flex items-center justify-center"><MailX size={22} /></span>
          <h1 className="t-display text-[28px] leading-8 mt-5">Link inválido ou expirado</h1>
          <p className="text-sm text-ink-2 mt-1.5">Este link de confirmação já foi usado ou não é válido. Se a conta já foi confirmada, é só entrar.</p>
          <Link to="/login" className={btnClass('secondary', 'lg', 'w-full mt-7')}>Ir para o login</Link>
        </div>
      )}
    </AuthLayout>
  )
}
