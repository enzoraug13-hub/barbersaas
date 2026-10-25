import { useState } from 'react'
import { Check, Copy, MessageCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field } from '../ui/Input'
import { btnClass } from '../ui/btnClass'
import { useResetTenantPassword, useSetTenantStatus } from '../../features/superadmin/superAdminApi'
import { generatePassword, accessMessage } from '../../lib/password'
import { apiErrorMessage } from '../../lib/apiError'

export interface TenantRef {
  id: string; name: string; slug: string; ownerEmail: string | null; status: 'Active' | 'Suspended'
}

/* Senha provisória: já vem gerada; dá para trocar ou gerar outra. */
export function ProvisionalPasswordField({ value, onChange, label = 'Senha provisória', error }: {
  value: string; onChange: (v: string) => void; label?: string; error?: string | null
}) {
  return (
    <Field label={label} htmlFor="provisional-password" error={error} hint="Mínimo de 8 caracteres. O dono entra com ela.">
      <div className="flex gap-2">
        <input id="provisional-password" className="ds-input flex-1 t-num" value={value} required minLength={8}
          autoComplete="off" spellCheck={false} aria-invalid={error ? true : undefined}
          onChange={e => onChange(e.target.value)} />
        <Button type="button" variant="secondary" onClick={() => onChange(generatePassword())} aria-label="Gerar outra senha">
          <RefreshCw size={15} /> <span className="lbl-long">Gerar outra</span>
        </Button>
      </div>
    </Field>
  )
}

/* Dados de acesso prontos para mandar ao dono. */
export function AccessDetails({ businessName, email, password, slug }: {
  businessName?: string; email?: string | null; password: string; slug?: string
}) {
  const [copied, setCopied] = useState(false)
  const text = accessMessage({ businessName, email, password, slug })
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Dados de acesso copiados.')
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie.')
    }
  }
  return (
    <div className="space-y-4">
      <dl className="ds-dl">
        <div><dt>Entrar em</dt><dd className="font-normal break-all">{window.location.host}/login</dd></div>
        {email && <div><dt>E-mail</dt><dd className="break-all">{email}</dd></div>}
        <div><dt>Senha</dt><dd className="t-num text-md">{password}</dd></div>
        {slug && <div><dt>Página de agendamento</dt><dd className="font-normal break-all">{window.location.host}/b/{slug}</dd></div>}
      </dl>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar mensagem'}</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={btnClass('secondary')}>
          <MessageCircle size={16} /> Enviar por WhatsApp
        </a>
      </div>
    </div>
  )
}

/* Redefinir a senha do dono. Montar só quando houver alvo (estado zera a cada abertura). */
export function ResetPasswordModal({ tenant, onClose }: { tenant: TenantRef; onClose: () => void }) {
  const resetPass = useResetTenantPassword()
  const [password, setPassword] = useState(() => generatePassword())
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.trim().length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return }
    setError(null)
    try {
      await resetPass.mutateAsync({ id: tenant.id, newPassword: password.trim() })
      setDone(true)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível redefinir a senha.'))
    }
  }

  if (done) {
    return (
      <Modal isOpen onClose={onClose} title="Senha redefinida" subtitle={tenant.name}
        footer={<Button variant="secondary" onClick={onClose}>Concluir</Button>}>
        <p className="text-sm text-ink-2 mb-4">As sessões abertas do dono foram encerradas. Mande os novos dados para ele.</p>
        <AccessDetails businessName={tenant.name} email={tenant.ownerEmail} password={password.trim()} />
      </Modal>
    )
  }

  return (
    <Modal isOpen onClose={onClose} title="Redefinir senha do dono" subtitle={tenant.name}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="reset-password" loading={resetPass.isPending}>Redefinir senha</Button>
      </>}>
      <form id="reset-password" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-2">
          Vale para o acesso de <span className="font-medium text-ink">{tenant.ownerEmail ?? 'dono'}</span>. Quem estiver com o painel aberto precisa entrar de novo.
        </p>
        <ProvisionalPasswordField label="Nova senha" value={password} onChange={v => { setPassword(v); if (error) setError(null) }} error={error} />
      </form>
    </Modal>
  )
}

/* Suspender ou reativar a conta. */
export function TenantStatusModal({ tenant, onClose }: { tenant: TenantRef; onClose: () => void }) {
  const setStatus = useSetTenantStatus()
  const suspend = tenant.status === 'Active'

  const confirm = async () => {
    try {
      await setStatus.mutateAsync({ id: tenant.id, status: suspend ? 'Suspended' : 'Active' })
      toast.success(suspend ? 'Conta suspensa.' : 'Conta reativada.')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível alterar o status da conta.'))
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={suspend ? 'Suspender conta' : 'Reativar conta'} subtitle={tenant.name}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant={suspend ? 'danger' : 'primary'} onClick={confirm} loading={setStatus.isPending}>
          {suspend ? 'Suspender conta' : 'Reativar conta'}
        </Button>
      </>}>
      <p className="text-sm text-ink-2">
        {suspend
          ? 'O dono e a equipe ficam impedidos de entrar no painel até você reativar. Nenhum dado é apagado.'
          : 'O dono e a equipe voltam a entrar no painel com as senhas que já tinham.'}
      </p>
    </Modal>
  )
}
