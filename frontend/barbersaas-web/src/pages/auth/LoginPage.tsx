import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Zap } from 'lucide-react'
import { useLogin } from '../../features/auth/authApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const DEMO_EMAIL    = 'demo@barbersaas.com'
const DEMO_PASSWORD = 'demo123456'

export default function LoginPage() {
  const navigate = useNavigate()
  const login    = useLogin()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login.mutateAsync(form)
      toast.success('Bem-vindo!')
      navigate('/admin')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Credenciais inválidas.')
    }
  }

  const handleDemo = async () => {
    try {
      await login.mutateAsync({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
      toast.success('Bem-vindo ao demo!')
      navigate('/admin')
    } catch {
      toast.error('Conta demo não encontrada. Verifique se a API está rodando.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}>
            <Scissors size={28} style={{ color: 'var(--bg-base)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>BarberSaaS</h1>
          <p className="ds-page-sub">Acesse o painel da sua barbearia</p>
        </div>

        <Card>
          <h2 className="ds-section-title mb-6" style={{ fontSize: 'var(--text-lg)' }}>Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ds-field">
              <label className="ds-label">E-mail</label>
              <input
                type="email"
                className="ds-input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="ds-field">
              <label className="ds-label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="ds-input pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" loading={login.isPending}>{login.isPending ? 'Entrando...' : 'Entrar'}</Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border-subtle)' }} />
            </div>
            <div className="relative flex justify-center" style={{ fontSize: 'var(--text-xs)' }}>
              <span className="px-2 ds-text-disabled" style={{ background: 'var(--bg-subtle)' }}>ou</span>
            </div>
          </div>

          <Button type="button" variant="ghost" onClick={handleDemo} disabled={login.isPending} className="w-full">
            <Zap size={16} style={{ color: 'var(--accent)' }} />
            Acessar conta demo
          </Button>

          <p className="ds-text-disabled text-center mt-2" style={{ fontSize: 'var(--text-xs)' }}>
            demo@barbersaas.com · demo123456
          </p>

          <p className="ds-text-disabled text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
            Não tem conta?{' '}
            <Link to="/register" className="ds-text-accent font-medium hover:underline">
              Criar barbearia grátis
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
