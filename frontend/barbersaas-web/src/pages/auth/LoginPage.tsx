import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useLogin } from '../../features/auth/authApi'
import { homeRouteFor } from '../../lib/roles'
import { Button } from '../../components/ui/Button'
import { RainCanvas } from '../../components/ui/RainCanvas'
import facade from '../../assets/login-facade.jpg'
import { apiErrorMessage, apiErrorStatus } from '../../lib/apiError'

/* Cena cinematográfica: fachada da barbearia à noite (asset local otimizado) +
   chuva leve em canvas + brilho pulsante de letreiro + card de vidro fosco.
   A cena é sempre noturna — textos do card usam cores fixas claras de propósito
   (exceção consciente aos tokens de tema, que invertem no modo claro); o dourado
   da marca continua vindo de var(--accent). Só visual: o fluxo de login é o mesmo. */
export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useLogin()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      // O destino sai do role recém-logado (super admin vai pra /super-admin,
      // os demais pro dashboard). Lê da resposta, não do store, pra não correr
      // risco de ler o estado anterior.
      const data = await login.mutateAsync(form)
      navigate(homeRouteFor(data?.user?.role))
    } catch (err) {
      // Sem resposta = problema de rede; com resposta, usa a mensagem do backend
      // (cobre bloqueio temporário e confirmação de e-mail pendente).
      if (apiErrorStatus(err) === undefined) setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
      else setError(apiErrorMessage(err, 'E-mail ou senha incorretos.'))
    }
  }

  const set = (k: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (error) setError(null)
  }

  return (
    <div className="login-scene flex items-center justify-center p-4 sm:p-6">
      {/* Cena de fundo: foto + overlay de contraste + brilho de letreiro + chuva */}
      <img src={facade} alt="" aria-hidden className="login-scene-img" />
      <div aria-hidden className="login-overlay" />
      <div aria-hidden className="login-sign-glow" />
      <RainCanvas />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Cartão de vidro fosco */}
        <div className="login-glass" style={{ padding: 'var(--space-8, 32px) var(--space-6)' }}>
          {/* Marca */}
          <div className="flex flex-col items-center mb-8 text-center">
            <h1 className="login-brand" style={{ fontSize: '34px', lineHeight: 1.1 }}>Trimly</h1>
            <p className="mt-2" style={{ fontSize: 'var(--text-sm)', color: 'rgba(235,230,218,0.72)' }}>
              Gestão e agendamento para barbearias
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="ds-field">
              <label className="ds-label" htmlFor="login-email">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(235,230,218,0.45)' }} />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className="ds-input"
                  style={{ paddingLeft: 40 }}
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div className="ds-field">
              <label className="ds-label" htmlFor="login-password">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(235,230,218,0.45)' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="ds-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(235,230,218,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5"
                style={{
                  background: 'rgba(224,92,92,0.14)',
                  border: '1px solid rgba(224,92,92,0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  color: '#f2a3a3',
                  fontSize: 'var(--text-sm)',
                }}>
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full mt-1" loading={login.isPending}>
              {login.isPending ? 'Entrando…' : <>Entrar <ArrowRight size={16} /></>}
            </Button>
          </form>

          {/* Auto-cadastro público desativado (contas criadas pelo super admin).
              Reativação futura (billing self-service): restaurar o bloco abaixo e o
              import de Link do react-router-dom.
          <p className="text-center mt-6" style={{ fontSize: 'var(--text-sm)', color: 'rgba(235,230,218,0.55)' }}>
            Não tem conta?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              Criar barbearia grátis
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  )
}
