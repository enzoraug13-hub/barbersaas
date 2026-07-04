import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { useLogin } from '../../features/auth/authApi'
import { Button } from '../../components/ui/Button'

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
      await login.mutateAsync(form)
      navigate('/admin')
    } catch (err: any) {
      // Sem resposta = problema de rede; com resposta, usa a mensagem do backend
      // (cobre bloqueio temporário e confirmação de e-mail pendente).
      if (!err?.response) setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
      else setError(err.response?.data?.errors?.[0] ?? 'E-mail ou senha incorretos.')
    }
  }

  const set = (k: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (error) setError(null)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Brilhos sutis da marca (carvão + dourado) */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 65%)' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full"
        style={{ background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 60%)' }} />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Marca */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center mb-4"
            style={{ background: 'var(--accent)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 28px var(--accent-soft)' }}>
            <Scissors size={26} style={{ color: 'var(--accent-fg)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Trimly
          </h1>
          <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)' }}>Gestão e agendamento para barbearias</p>
        </div>

        {/* Cartão de login */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-md, 0 12px 32px rgba(0,0,0,0.35))',
        }}>
          <h2 className="ds-section-title" style={{ fontSize: 'var(--text-lg)' }}>Bem-vindo de volta</h2>
          <p className="ds-text-secondary mb-6 mt-1" style={{ fontSize: 'var(--text-sm)' }}>Entre no painel da sua barbearia.</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="ds-field">
              <label className="ds-label" htmlFor="login-email">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
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
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
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
                  style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5"
                style={{
                  background: 'rgba(224,92,92,0.10)',
                  border: '1px solid rgba(224,92,92,0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  color: 'var(--color-error)',
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
        </div>

        <p className="ds-text-disabled text-center mt-5" style={{ fontSize: 'var(--text-sm)' }}>
          Não tem conta?{' '}
          <Link to="/register" className="ds-text-accent font-medium hover:underline">
            Criar barbearia grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
