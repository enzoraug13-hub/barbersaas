import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { useRegister } from '../../features/auth/authApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: 'var(--tenant-primary)', borderRadius: 'var(--radius-lg)' }}>
            <Scissors size={28} style={{ color: 'var(--bg-base)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Criar sua Barbearia</h1>
          <p className="ds-page-sub">14 dias grátis, sem cartão de crédito</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="ds-field">
              <label className="ds-label">Nome da Barbearia</label>
              <input className="ds-input" placeholder="Barbearia do João" value={form.businessName} onChange={set('businessName')} required />
            </div>
            <div className="ds-field">
              <label className="ds-label">Seu nome</label>
              <input className="ds-input" placeholder="João Silva" value={form.ownerName} onChange={set('ownerName')} required />
            </div>
            <div className="ds-field">
              <label className="ds-label">E-mail</label>
              <input type="email" className="ds-input" placeholder="joao@email.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="ds-field">
              <label className="ds-label">WhatsApp</label>
              <input className="ds-input" placeholder="+5511999999999" value={form.phone} onChange={set('phone')} required />
            </div>
            <div className="ds-field">
              <label className="ds-label">Senha</label>
              <input type="password" className="ds-input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} minLength={8} required />
            </div>

            <Button type="submit" className="w-full mt-2" loading={register.isPending}>{register.isPending ? 'Criando...' : 'Criar barbearia grátis'}</Button>
          </form>

          <p className="ds-text-disabled text-center mt-4" style={{ fontSize: 'var(--text-sm)' }}>
            Já tem conta?{' '}
            <Link to="/login" className="ds-text-accent font-medium hover:underline">Entrar</Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
