import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useRegister } from '../../features/auth/authApi'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Field, Input } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Controls'
import { PhoneField } from '../../components/ui/PhoneField'
import { resetTenantTheme } from '../../lib/theme-tenant'
import { toE164BR, isValidBRPhone, onlyDigits, maskCPF, maskCNPJ, isValidCPF, isValidCNPJ } from '../../lib/masks'
import { AuthLayout } from './AuthLayout'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

type PersonType = 'PF' | 'PJ'

// Auto-cadastro público está DESLIGADO no router (contas criadas pelo super admin).
// A tela fica pronta para a reativação com billing self-service.
export default function RegisterPage() {
  const navigate  = useNavigate()
  const register  = useRegister()
  const [form, setForm] = useState({ businessName: '', ownerName: '', email: '', password: '' })
  const [personType, setPersonType] = useState<PersonType>('PF')
  const [docDigits, setDocDigits]   = useState('')
  const [docError, setDocError]     = useState<string | null>(null)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  useEffect(() => { resetTenantTheme(); document.title = 'Criar conta | Trimly' }, [])

  const isPF = personType === 'PF'

  // Trocar PF/PJ limpa o documento (tamanhos e máscaras diferentes).
  const switchType = (t: PersonType) => {
    if (t === personType) return
    setPersonType(t); setDocDigits(''); setDocError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let invalid = false
    if (isPF ? !isValidCPF(docDigits) : !isValidCNPJ(docDigits)) {
      setDocError(isPF ? 'CPF inválido. Confira os números.' : 'CNPJ inválido. Confira os números.')
      invalid = true
    } else setDocError(null)
    if (!isValidBRPhone(phoneDigits)) { setPhoneError('Telefone inválido. Informe DDD e número.'); invalid = true }
    else setPhoneError(null)
    if (form.password.length < 8) { setPasswordError('A senha precisa ter pelo menos 8 caracteres.'); invalid = true }
    else setPasswordError(null)
    if (invalid) return

    try {
      const data = await register.mutateAsync({
        ...form, phone: toE164BR(phoneDigits), personType, document: docDigits,
      })
      if (data.requiresEmailConfirmation) {
        // Conta criada pendente: sem login automático até clicar no link do e-mail.
        setPendingEmail(form.email)
        return
      }
      toast.success('Barbearia criada.')
      navigate('/admin')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível criar a conta.'))
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (k === 'password' && passwordError) setPasswordError(null)
  }

  if (pendingEmail) {
    return (
      <AuthLayout>
        <span className="w-12 h-12 rounded-full bg-accent-soft text-accent-ink flex items-center justify-center"><MailCheck size={22} /></span>
        <h1 className="t-display text-[28px] leading-8 mt-5">Confirme seu e-mail</h1>
        <p className="text-sm text-ink-2 mt-1.5">
          Enviamos um link para <span className="font-medium text-ink">{pendingEmail}</span>. Abra o link para ativar a conta e entrar.
        </p>
        <p className="text-13 text-ink-3 mt-3">Não chegou em alguns minutos? Veja a caixa de spam.</p>
        <Link to="/login" className={btnClass('secondary', 'lg', 'w-full mt-7')}>Ir para o login</Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout wide>
      <h1 className="t-display text-[28px] leading-8">Criar conta</h1>
      <p className="text-sm text-ink-2 mt-1.5">14 dias grátis, sem cartão de crédito.</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <Field label="Tipo de cadastro">
          <Segmented value={personType} onChange={switchType} ariaLabel="Tipo de cadastro" options={[
            { value: 'PF', label: 'Pessoa física' }, { value: 'PJ', label: 'Pessoa jurídica' },
          ]} />
        </Field>

        <Input label={isPF ? 'CPF' : 'CNPJ'} inputMode="numeric" required error={docError}
          placeholder={isPF ? '000.000.000-00' : '00.000.000/0000-00'}
          hint={!isPF ? 'Conferimos o CNPJ na Receita Federal.' : undefined}
          value={isPF ? maskCPF(docDigits) : maskCNPJ(docDigits)}
          onChange={e => {
            setDocDigits(onlyDigits(e.target.value).slice(0, isPF ? 11 : 14))
            if (docError) setDocError(null)
          }} />

        <Input label="Seu nome" autoComplete="name" value={form.ownerName} onChange={set('ownerName')} required />
        <Input label="Nome da barbearia" autoComplete="organization" value={form.businessName} onChange={set('businessName')} required />
        <Input label="E-mail" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set('email')} required
          hint="É com ele que você entra no painel." />
        <PhoneField label="WhatsApp" value={phoneDigits} required
          onChange={d => { setPhoneDigits(d); if (phoneError) setPhoneError(null) }}
          error={phoneError ?? undefined} />
        <Input label="Senha" type="password" autoComplete="new-password" value={form.password} onChange={set('password')}
          minLength={8} required error={passwordError}
          hint={form.password.length > 0 && form.password.length < 8 ? `Faltam ${8 - form.password.length} caracteres.` : 'Mínimo de 8 caracteres.'} />

        <Button type="submit" size="lg" block loading={register.isPending} className="!mt-6">Criar conta</Button>
      </form>

      <p className="text-13 text-ink-2 mt-6">
        Já tem conta? <Link to="/login" className="ds-link">Entrar</Link>
      </p>
    </AuthLayout>
  )
}
