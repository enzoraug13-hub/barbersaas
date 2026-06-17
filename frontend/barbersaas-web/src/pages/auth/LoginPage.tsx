import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useLogin } from '../../features/auth/authApi'
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
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <Scissors size={28} className="text-accentFg" />
          </div>
          <h1 className="text-2xl font-bold text-content">BarberSaaS</h1>
          <p className="text-muted text-sm mt-1">Acesse o painel da sua barbearia</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-content mb-6">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-content">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={login.isPending} className="btn-primary w-full mt-2">
              {login.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              {login.isPending ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-surface text-subtle">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemo}
            disabled={login.isPending}
            className="btn-ghost w-full border border-border hover:border-accent/50">
            <Zap size={16} className="text-accent" />
            Acessar conta demo
          </button>

          <p className="text-center text-xs text-subtle mt-2">
            demo@barbersaas.com · demo123456
          </p>

          <p className="text-center text-sm text-subtle mt-4">
            Não tem conta?{' '}
            <Link to="/register" className="text-accent hover:text-accent font-medium">
              Criar barbearia grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
