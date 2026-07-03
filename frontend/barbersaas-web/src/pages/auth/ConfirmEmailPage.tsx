import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, MailCheck, MailX } from 'lucide-react'
import { useConfirmEmail } from '../../features/auth/authApi'
import { Card } from '../../components/ui/Card'

// Destino do link enviado por e-mail no cadastro: /confirmar-email?token=...
export default function ConfirmEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const confirm = useConfirmEmail()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error')
  const fired = useRef(false)

  useEffect(() => {
    if (!token || fired.current) return
    fired.current = true // StrictMode monta 2x — o token é de uso único
    confirm.mutateAsync(token)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md">
        <Card className="text-center py-10 space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 size={36} className="mx-auto animate-spin" style={{ color: 'var(--accent)' }} />
              <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Confirmando seu e-mail…</p>
            </>
          )}
          {status === 'ok' && (
            <>
              <MailCheck size={40} className="mx-auto" style={{ color: 'var(--color-success)' }} />
              <h1 className="ds-section-title" style={{ fontSize: 'var(--text-lg)' }}>E-mail confirmado!</h1>
              <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                Sua conta está ativa. Agora é só entrar.
              </p>
              <Link to="/login" className="ds-text-accent font-medium hover:underline" style={{ fontSize: 'var(--text-sm)' }}>
                Fazer login
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <MailX size={40} className="mx-auto" style={{ color: 'var(--color-error)' }} />
              <h1 className="ds-section-title" style={{ fontSize: 'var(--text-lg)' }}>Link inválido ou expirado</h1>
              <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                Este link de confirmação não é válido ou já foi utilizado.
                Se sua conta já foi confirmada, é só fazer login.
              </p>
              <Link to="/login" className="ds-text-accent font-medium hover:underline" style={{ fontSize: 'var(--text-sm)' }}>
                Ir para o login
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
