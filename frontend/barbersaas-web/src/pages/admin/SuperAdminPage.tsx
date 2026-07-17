import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, KeyRound, ShieldCheck, Ban, CheckCircle2, Copy, Building2, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  useSuperAdminTenants, useCreateTenantAccount, useSetTenantStatus, useResetTenantPassword,
  type TenantAccount,
} from '../../features/superadmin/superAdminApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const EMPTY_FORM = { businessName: '', ownerName: '', ownerEmail: '', provisionalPassword: '' }
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function SuperAdminPage() {
  const { data: tenants, isLoading } = useSuperAdminTenants()
  const create      = useCreateTenantAccount()
  const setStatus   = useSetTenantStatus()
  const resetPass   = useResetTenantPassword()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [resetTarget, setResetTarget] = useState<TenantAccount | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.provisionalPassword.length < 8) { toast.error('A senha provisória precisa de 8+ caracteres.'); return }
    try {
      const res = await create.mutateAsync({
        businessName: form.businessName,
        ownerEmail: form.ownerEmail,
        provisionalPassword: form.provisionalPassword,
        ownerName: form.ownerName || undefined,
      })
      toast.success(`Conta criada — slug: ${res.slug}`)
      setShowCreate(false); setForm(EMPTY_FORM)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao criar a conta.'))
    }
  }

  const handleToggle = async (t: TenantAccount) => {
    const next = t.status === 'Active' ? 'Suspended' : 'Active'
    const verb = next === 'Suspended' ? 'suspender' : 'reativar'
    if (!window.confirm(`Tem certeza que quer ${verb} "${t.name}"? ${next === 'Suspended' ? 'O dono não conseguirá mais entrar.' : ''}`)) return
    try {
      await setStatus.mutateAsync({ id: t.id, status: next })
      toast.success(next === 'Suspended' ? 'Conta suspensa.' : 'Conta reativada.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao alterar o status.'))
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    if (newPassword.length < 8) { toast.error('A senha precisa de 8+ caracteres.'); return }
    try {
      await resetPass.mutateAsync({ id: resetTarget.id, newPassword })
      toast.success(`Senha do dono de "${resetTarget.name}" redefinida.`)
      setResetTarget(null); setNewPassword('')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao redefinir a senha.'))
    }
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/b/${slug}`)
    toast.success('Link público copiado!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="ds-page-title flex items-center gap-2">
            <ShieldCheck size={24} style={{ color: 'var(--accent)' }} /> Super Admin
          </h2>
          <p className="ds-page-sub">Gestão de contas — criar, suspender e redefinir senha das barbearias.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nova conta</Button>
      </div>

      {isLoading ? (
        <Card><Skeleton className="h-40" /></Card>
      ) : !tenants?.length ? (
        <EmptyState icon={Building2} title="Nenhuma conta ainda" hint="Crie a primeira barbearia pelo botão acima." />
      ) : (
        <Card className="overflow-x-auto" style={{ padding: 0 }}>
          <table className="w-full" style={{ fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Barbearia</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Dono</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Financeiro</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Criada em</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {/* O nome abre o "mundo" da barbearia (detalhe da conta). */}
                    <Link to={`/super-admin/contas/${t.id}`}
                      className="ds-text-primary font-medium hover:underline inline-flex items-center gap-1">
                      {t.name} <ChevronRight size={13} style={{ color: 'var(--text-secondary)' }} />
                    </Link>
                    <button onClick={() => copyLink(t.slug)} className="flex items-center gap-1 ds-text-secondary hover:underline"
                      style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      /b/{t.slug} <Copy size={11} />
                    </button>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <p className="ds-text-primary">{t.ownerName ?? '—'}</p>
                    <p className="ds-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{t.ownerEmail ?? '—'}</p>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={t.status === 'Active' ? 'success' : 'error'}>
                      {t.status === 'Active' ? 'Ativa' : 'Suspensa'}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {/* Bate-olho de cobrança: quem deve aparece em amarelo com o valor. */}
                    {t.openAmount > 0
                      ? <Badge variant="warning">{fmt(t.openAmount)} em aberto</Badge>
                      : <Badge variant="success">Em dia</Badge>}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-secondary">
                    {format(parseISO(t.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      <Button variant="ghost" onClick={() => handleToggle(t)}
                        style={{ fontSize: 'var(--text-xs)', height: 30, color: t.status === 'Active' ? 'var(--color-error)' : 'var(--color-success)' }}>
                        {t.status === 'Active' ? <><Ban size={13} /> Suspender</> : <><CheckCircle2 size={13} /> Reativar</>}
                      </Button>
                      <Button variant="ghost" onClick={() => { setResetTarget(t); setNewPassword('') }}
                        style={{ fontSize: 'var(--text-xs)', height: 30 }}>
                        <KeyRound size={13} /> Redefinir senha
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Criar conta */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova conta de barbearia">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome da barbearia" value={form.businessName} onChange={set('businessName')} required maxLength={150} />
          <Input label="Nome do dono (opcional)" value={form.ownerName} onChange={set('ownerName')} maxLength={150} />
          <Input label="E-mail do dono" type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required />
          <Input label="Senha provisória" type="text" value={form.provisionalPassword} onChange={set('provisionalPassword')}
            required minLength={8} placeholder="Mínimo 8 caracteres — anote e entregue ao dono" autoComplete="off" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" loading={create.isPending}>{create.isPending ? 'Criando...' : 'Criar conta'}</Button>
          </div>
        </form>
      </Modal>

      {/* Redefinir senha */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Redefinir senha — ${resetTarget?.name ?? ''}`}>
        <form onSubmit={handleReset} className="space-y-4">
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            A nova senha vale para o dono ({resetTarget?.ownerEmail ?? '—'}). As sessões ativas dele serão encerradas.
          </p>
          <Input label="Nova senha provisória" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="off" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>Cancelar</Button>
            <Button type="submit" loading={resetPass.isPending}>{resetPass.isPending ? 'Salvando...' : 'Redefinir'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
