import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Building2, ChevronRight, Copy, KeyRound } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  useSuperAdminTenants, useCreateTenantAccount, type TenantAccount,
} from '../../features/superadmin/superAdminApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Ledger } from '../../components/ui/Ledger'
import { Segmented } from '../../components/ui/Controls'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, LedgerSkeleton } from '../../components/ui/Skeleton'
import {
  AccessDetails, ProvisionalPasswordField, ResetPasswordModal, TenantStatusModal,
} from '../../components/admin/TenantAccessModals'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { generatePassword } from '../../lib/password'
import { brl, num } from '../../lib/format'
import { apiErrorMessage } from '../../lib/apiError'

type Filter = 'all' | 'open' | 'suspended'
const emptyForm = () => ({ businessName: '', ownerName: '', ownerEmail: '', provisionalPassword: generatePassword() })

export default function SuperAdminPage() {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const { data: tenants, isLoading } = useSuperAdminTenants()
  const create = useCreateTenantAccount()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ businessName: string; email: string; password: string; slug: string } | null>(null)
  const [resetTarget, setResetTarget] = useState<TenantAccount | null>(null)
  const [statusTarget, setStatusTarget] = useState<TenantAccount | null>(null)

  const set = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const openCreate = () => { setForm(emptyForm()); setPasswordError(null); setShowCreate(true) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const password = form.provisionalPassword.trim()
    if (password.length < 8) { setPasswordError('A senha precisa ter pelo menos 8 caracteres.'); return }
    setPasswordError(null)
    try {
      const res = await create.mutateAsync({
        businessName: form.businessName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        provisionalPassword: password,
        ownerName: form.ownerName.trim() || undefined,
      })
      setShowCreate(false)
      setCreated({ businessName: form.businessName.trim(), email: res.ownerEmail ?? form.ownerEmail.trim(), password, slug: res.slug })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível criar a conta.'))
    }
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/b/${slug}`)
    toast.success('Link de agendamento copiado.')
  }

  const all = tenants ?? []
  const active = all.filter(t => t.status === 'Active').length
  const suspended = all.length - active
  const withOpen = all.filter(t => t.openAmount > 0)
  const openTotal = withOpen.reduce((s, t) => s + t.openAmount, 0)

  const q = search.trim().toLowerCase()
  const shown = all
    .filter(t => filter === 'all' || (filter === 'open' ? t.openAmount > 0 : t.status === 'Suspended'))
    .filter(t => !q || [t.name, t.slug, t.ownerName ?? '', t.ownerEmail ?? ''].some(v => v.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <div className="space-y-5">
      <PageHeader title="Barbearias"
        subtitle={tenants ? `${num(all.length)} ${all.length === 1 ? 'conta' : 'contas'} no Trimly` : undefined}
        actions={<Button onClick={openCreate}><Plus size={16} /> <span className="lbl-long">Nova barbearia</span><span className="lbl-short">Nova</span></Button>} />

      {isLoading ? <LedgerSkeleton cells={3} /> : all.length > 0 && (
        <Ledger items={[
          { label: 'Contas ativas', value: num(active), foot: suspended ? <span>{num(suspended)} {suspended === 1 ? 'suspensa' : 'suspensas'}</span> : undefined },
          { label: 'Com fatura em aberto', value: num(withOpen.length) },
          { label: 'Total em aberto', value: brl(openTotal) },
        ]} />
      )}

      {all.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="sm:max-w-[360px] flex-1">
            <Input type="search" placeholder="Buscar por nome, link ou e-mail" value={search} aria-label="Buscar barbearia"
              onChange={e => setSearch(e.target.value)} leading={<Search size={16} />} />
          </div>
          <Segmented value={filter} onChange={setFilter} ariaLabel="Filtrar contas" options={[
            { value: 'all', label: 'Todas' },
            { value: 'open', label: 'Em aberto', count: withOpen.length || undefined },
            { value: 'suspended', label: 'Suspensas', count: suspended || undefined },
          ]} />
        </div>
      )}

      {isLoading ? <ListSkeleton rows={5} /> : !all.length ? (
        <EmptyState boxed icon={Building2} title="Nenhuma barbearia cadastrada"
          hint="Crie a conta, mande os dados de acesso ao dono e ele já começa a usar."
          action={<Button variant="secondary" onClick={openCreate}><Plus size={16} /> Criar a primeira conta</Button>} />
      ) : !shown.length ? (
        <EmptyState boxed icon={Search} title="Nenhuma conta encontrada" hint="Troque o filtro ou busque por outro termo." />
      ) : desktop ? (
        <Panel pad={false}>
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Barbearia</th>
                  <th>Dono</th>
                  <th>Situação</th>
                  <th>Cobrança</th>
                  <th>Cliente desde</th>
                  <th className="ds-right"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(t => (
                  <tr key={t.id} className="ds-row-link" onClick={() => navigate(`/super-admin/contas/${t.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} size={32} />
                        <div className="min-w-0">
                          <Link to={`/super-admin/contas/${t.id}`} className="font-medium hover:underline" onClick={e => e.stopPropagation()}>{t.name}</Link>
                          <button type="button" onClick={e => { e.stopPropagation(); copyLink(t.slug) }}
                            className="flex items-center gap-1 text-13 text-ink-3 hover:text-ink" title="Copiar link de agendamento">
                            /b/{t.slug} <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p>{t.ownerName ?? <span className="text-ink-3">Sem nome</span>}</p>
                      <p className="text-13 text-ink-3">{t.ownerEmail ?? ''}</p>
                    </td>
                    <td>{t.status === 'Active' ? <Pill tone="ok">Ativa</Pill> : <Pill tone="bad">Suspensa</Pill>}</td>
                    <td>{t.openAmount > 0 ? <Pill tone="warn">{brl(t.openAmount)} em aberto</Pill> : <span className="text-ink-2">Em dia</span>}</td>
                    <td className="ds-muted t-num whitespace-nowrap">{format(parseISO(t.createdAt), 'dd/MM/yyyy')}</td>
                    <td className="ds-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setResetTarget(t)}><KeyRound size={14} /> Senha</Button>
                        <Button variant={t.status === 'Active' ? 'danger-ghost' : 'ghost'} size="sm" onClick={() => setStatusTarget(t)}>
                          {t.status === 'Active' ? 'Suspender' : 'Reativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <ul className="ds-list">
            {shown.map(t => (
              <li key={t.id}>
                <Link to={`/super-admin/contas/${t.id}`} className="ds-row">
                  <Avatar name={t.name} size={36} />
                  <div className="ds-row-main">
                    <p className="ds-row-title">{t.name}</p>
                    <p className="ds-row-sub">{t.openAmount > 0 ? `${brl(t.openAmount)} em aberto` : 'Em dia'}</p>
                  </div>
                  {t.status === 'Suspended' && <Pill tone="bad">Suspensa</Pill>}
                  <ChevronRight size={16} className="text-ink-3 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Nova barbearia */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova barbearia"
        subtitle="A conta já nasce com a página de agendamento no ar."
        footer={<>
          <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          <Button type="submit" form="new-tenant" loading={create.isPending}>Criar conta</Button>
        </>}>
        <form id="new-tenant" onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome da barbearia" value={form.businessName} onChange={set('businessName')} required maxLength={150} autoComplete="off" />
          <Input label="Nome do dono" optional value={form.ownerName} onChange={set('ownerName')} maxLength={150} autoComplete="off" />
          <Input label="E-mail do dono" type="email" value={form.ownerEmail} onChange={set('ownerEmail')} required autoComplete="off"
            hint="É o login dele no painel." />
          <ProvisionalPasswordField value={form.provisionalPassword} error={passwordError}
            onChange={v => { setForm(f => ({ ...f, provisionalPassword: v })); if (passwordError) setPasswordError(null) }} />
        </form>
      </Modal>

      {/* Conta criada: dados para mandar ao dono */}
      <Modal isOpen={!!created} onClose={() => setCreated(null)} title="Conta criada" subtitle={created?.businessName}
        footer={<Button variant="secondary" onClick={() => setCreated(null)}>Concluir</Button>}>
        {created && (
          <>
            <p className="text-sm text-ink-2 mb-4">Mande estes dados para o dono. A senha não aparece de novo depois que você fechar.</p>
            <AccessDetails businessName={created.businessName} email={created.email} password={created.password} slug={created.slug} />
          </>
        )}
      </Modal>

      {resetTarget && <ResetPasswordModal tenant={resetTarget} onClose={() => setResetTarget(null)} />}
      {statusTarget && <TenantStatusModal tenant={statusTarget} onClose={() => setStatusTarget(null)} />}
    </div>
  )
}
