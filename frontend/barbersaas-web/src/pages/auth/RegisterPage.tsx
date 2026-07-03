import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Scissors, Check, MailCheck } from 'lucide-react'
import { useRegister } from '../../features/auth/authApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { PhoneField } from '../../components/ui/PhoneField'
import { toE164BR, isValidBRPhone } from '../../lib/masks'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate  = useNavigate()
  const register  = useRegister()
  const [form, setForm] = useState({
    businessName: '', ownerName: '', email: '', password: ''
  })
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const passwordOk = form.password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidBRPhone(phoneDigits)) {
      setPhoneError('Telefone inválido. Informe DDD + número.')
      return
    }
    setPhoneError(null)
    if (!passwordOk) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    try {
      const data = await register.mutateAsync({ ...form, phone: toE164BR(phoneDigits) })
      if (data.requiresEmailConfirmation) {
        // Conta criada pendente: sem auto-login até clicar no link do e-mail.
        setPendingEmail(form.email)
        return
      }
      toast.success('Barbearia criada! Bem-vindo!')
      navigate('/admin')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao criar barbearia.')
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
        <div className="w-full max-w-md">
          <Card className="text-center py-10 space-y-4">
            <MailCheck size={40} className="mx-auto" style={{ color: 'var(--accent)' }} />
            <h1 className="ds-section-title" style={{ fontSize: 'var(--text-lg)' }}>Confirme seu e-mail</h1>
            <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
              Enviamos um link de confirmação para <b>{pendingEmail}</b>.<br />
              Clique no link para ativar sua conta e fazer login.
            </p>
            <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>
              Não chegou? Verifique a caixa de spam.
            </p>
            <Link to="/login" className="ds-text-accent font-medium hover:underline" style={{ fontSize: 'var(--text-sm)' }}>
              Ir para o login
            </Link>
          </Card>
        </div>
      </div>
    )
  }

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
            <PhoneField label="WhatsApp" value={phoneDigits} required
              onChange={d => { setPhoneDigits(d); if (phoneError) setPhoneError(null) }}
              error={phoneError ?? undefined} />
            <div className="ds-field">
              <label className="ds-label">Senha</label>
              <input type="password" className="ds-input" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set('password')} minLength={8} required />
              {form.password.length > 0 && (
                <span className="flex items-center gap-1.5 mt-1.5" style={{
                  fontSize: 'var(--text-xs)',
                  color: passwordOk ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  <Check size={13} />
                  {passwordOk ? 'Senha com o tamanho mínimo.' : `Mínimo 8 caracteres (faltam ${8 - form.password.length}).`}
                </span>
              )}
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
