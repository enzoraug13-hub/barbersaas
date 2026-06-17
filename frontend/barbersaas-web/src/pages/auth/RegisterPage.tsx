import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Loader2 } from 'lucide-react'
import { useRegister } from '../../features/auth/authApi'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate  = useNavigate()
  const register  = useRegister()
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', password: '', phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register.mutateAsync(form)
      toast.success('Barbearia criada! Bem-vindo!')
      navigate('/admin')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao criar barbearia.')
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-4">
            <Scissors size={28} className="text-accentFg" />
          </div>
          <h1 className="text-2xl font-bold text-content">Criar sua Barbearia</h1>
          <p className="text-muted text-sm mt-1">14 dias grátis, sem cartão de crédito</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nome da Barbearia</label>
              <input className="input" placeholder="Barbearia do João" value={form.businessName} onChange={set('businessName')} required />
            </div>
            <div>
              <label className="label">Seu nome</label>
              <input className="input" placeholder="João Silva" value={form.ownerName} onChange={set('ownerName')} required />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="joao@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input className="input" placeholder="+5511999999999" value={form.phone} onChange={set('phone')} required />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} minLength={8} required />
            </div>

            <button type="submit" disabled={register.isPending} className="btn-primary w-full mt-2">
              {register.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
              {register.isPending ? 'Criando...' : 'Criar barbearia grátis'}
            </button>
          </form>

          <p className="text-center text-sm text-subtle mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-accent hover:text-accent font-medium">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
