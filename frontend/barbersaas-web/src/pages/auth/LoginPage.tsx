import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useLogin } from '../../features/auth/authApi'
import { homeRouteFor } from '../../lib/roles'
import { resetTenantTheme } from '../../lib/theme-tenant'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AuthLayout } from './AuthLayout'
import { apiErrorMessage, apiErrorStatus } from '../../lib/apiError'

export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useLogin()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Login é do Trimly, não de uma barbearia: volta para as cores padrão.
  useEffect(() => { resetTenantTheme(); document.title = 'Entrar | Trimly' }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      // O destino sai do papel recém-logado (super admin → /super-admin).
      // Lê da resposta, não do store, para não pegar o estado anterior.
      const data = await login.mutateAsync(form)
      navigate(homeRouteFor(data?.user?.role))
    } catch (err) {
      // Sem resposta = rede; com resposta, usa a mensagem do backend
      // (cobre bloqueio temporário e e-mail não confirmado).
      if (apiErrorStatus(err) === undefined) setError('Sem conexão com o servidor. Verifique sua internet e tente de novo.')
      else setError(apiErrorMessage(err, 'E-mail ou senha incorretos.'))
    }
  }

  const set = (k: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (error) setError(null)
  }

  return (
    <AuthLayout>
      <h1 className="t-display text-[28px] leading-8 text-ink">Entrar</h1>
      <p className="text-sm text-ink-2 mt-1.5">Use o e-mail e a senha da sua barbearia.</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <Input label="E-mail" type="email" autoComplete="email" inputMode="email" placeholder="voce@barbearia.com.br"
          value={form.email} onChange={set('email')} required autoFocus />

        <Input label="Senha" type={showPass ? 'text' : 'password'} autoComplete="current-password"
          value={form.password} onChange={set('password')} required
          trailing={
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm"
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          } />

        {error && (
          <div role="alert" className="ds-notice ds-notice-bad">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" block loading={login.isPending} className="!mt-6">Entrar</Button>
      </form>

      <p className="text-13 text-ink-3 mt-6">
        Esqueceu a senha? Peça uma nova ao suporte do Trimly.
      </p>

      {/* Auto-cadastro público desativado (contas criadas pelo super admin).
          Reativação futura (billing self-service): restaurar o link abaixo e o
          import de Link do react-router-dom.
      <p className="text-13 text-ink-2 mt-6">
        Ainda não usa o Trimly? <Link to="/register" className="ds-link">Criar conta</Link>
      </p> */}
    </AuthLayout>
  )
}
