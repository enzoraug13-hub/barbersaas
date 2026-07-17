import { useState } from 'react'
import { Gift, Star, Package, Tag, Check, X, Plus, Pencil, Inbox, Wallet } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { NumberField } from '../../components/ui/NumberField'
import {
  useLoyaltyProgram, useLoyaltyRewards, useSaveLoyaltyReward,
  useLoyaltyBalances, useLoyaltyRedemptions, useResolveRedemption, unitLabel,
} from '../../features/loyalty/loyaltyApi'
import type { LoyaltyReward, LoyaltyRewardType, SaveRewardInput } from '../../features/loyalty/loyaltyApi'
import { useServices } from '../../features/services/servicesApi'
import { useProducts } from '../../features/products/productsApi'
import { formatPhoneBR } from '../../lib/masks'
import type { Service, Product } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

const statusLabel   = { Pending: 'Pendente', Delivered: 'Entregue', Cancelled: 'Cancelado' } as const
const statusVariant = { Pending: 'warning', Delivered: 'success', Cancelled: 'error' } as const

type Tab = 'resgates' | 'recompensas' | 'saldos'

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('resgates')
  const { data: program } = useLoyaltyProgram()
  const mode = program?.mode

  const { data: redemptions } = useLoyaltyRedemptions()
  const pendingCount = redemptions?.filter(r => r.status === 'Pending').length ?? 0

  const tabs = [
    { id: 'resgates' as Tab,    label: 'Resgates',    icon: Inbox,  badge: pendingCount || undefined },
    { id: 'recompensas' as Tab, label: 'Recompensas', icon: Gift },
    { id: 'saldos' as Tab,      label: 'Saldos',      icon: Wallet },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="ds-page-title">Fidelidade</h2>
        <p className="ds-page-sub">
          {mode === 'Visits'
            ? 'Programa por cortes: cada atendimento concluído vale 1 corte.'
            : `Programa por pontos: R$ 1 gasto = ${program?.pointsPerReal ?? 1} ponto(s).`}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`ds-config-tab ${tab === id ? 'ds-config-tab-active' : ''}`}>
            <Icon size={16} />
            {label}
            {badge != null && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 10, fontWeight: 700 }}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'resgates'    && <RedemptionsTab mode={mode} />}
      {tab === 'recompensas' && <RewardsTab mode={mode} />}
      {tab === 'saldos'      && <BalancesTab mode={mode} />}
    </div>
  )
}

/* ================= Resgates ================= */
function RedemptionsTab({ mode }: { mode?: 'Points' | 'Visits' }) {
  const { data: redemptions, isLoading } = useLoyaltyRedemptions()
  const resolve = useResolveRedemption()

  const act = async (id: string, deliver: boolean) => {
    try {
      await resolve.mutateAsync({ id, deliver })
      toast.success(deliver ? 'Resgate entregue!' : 'Resgate cancelado — pontos devolvidos.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao resolver o resgate.'))
    }
  }

  if (isLoading) return <ListSkeleton />
  if (!redemptions?.length)
    return <EmptyState icon={Inbox} title="Nenhum resgate ainda"
      action={<p className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Quando um cliente resgatar uma recompensa, ela aparece aqui.</p>} />

  // Pendentes primeiro — são os acionáveis.
  const sorted = [...redemptions].sort((a, b) =>
    (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1))

  return (
    <div className="ds-table-wrap">
      <div className="overflow-x-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Recompensa</th>
              <th className="text-center hidden sm:table-cell">Custo</th>
              <th className="hidden md:table-cell">Quando</th>
              <th className="text-center">Status</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td>
                  <p className="ds-text-primary font-medium">{r.clientName}</p>
                  <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{formatPhoneBR(r.clientPhone)}</p>
                </td>
                <td className="ds-text-primary">{r.rewardName}</td>
                <td className="text-center hidden sm:table-cell">
                  <span className="ds-text-accent inline-flex items-center gap-1"><Star size={12} />{r.costPaid} {unitLabel(mode, r.costPaid)}</span>
                </td>
                <td className="ds-text-secondary hidden md:table-cell" style={{ fontSize: 'var(--text-sm)' }}>
                  {when(r.requestedAt)}
                  {r.resolvedAt && <span className="ds-text-disabled"> · resolvido {when(r.resolvedAt)}</span>}
                </td>
                <td className="text-center"><Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge></td>
                <td className="text-center">
                  {r.status === 'Pending' && (
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" onClick={() => act(r.id, true)} disabled={resolve.isPending}
                        style={{ height: 28, padding: '0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                        <Check size={13} /> Entregue
                      </Button>
                      <Button variant="ghost" onClick={() => act(r.id, false)} disabled={resolve.isPending}
                        style={{ height: 28, padding: '0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                        <X size={13} /> Cancelar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= Recompensas (catálogo) ================= */
const emptyForm: SaveRewardInput = { name: '', description: '', type: 'Service', serviceId: null, productId: null, cost: 10, isActive: true }

function RewardsTab({ mode }: { mode?: 'Points' | 'Visits' }) {
  const { data: rewards, isLoading } = useLoyaltyRewards()
  const { data: services } = useServices()
  const { data: products } = useProducts()
  const save = useSaveLoyaltyReward()

  const [editing, setEditing] = useState<SaveRewardInput | null>(null)

  const openNew  = () => setEditing({ ...emptyForm })
  const openEdit = (r: LoyaltyReward) => setEditing({
    id: r.id, name: r.name, description: r.description ?? '', type: r.type,
    serviceId: r.serviceId, productId: r.productId, cost: r.cost, isActive: r.isActive,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (editing.type === 'Service' && !editing.serviceId) { toast.error('Escolha o serviço.'); return }
    if (editing.type === 'Product' && !editing.productId) { toast.error('Escolha o produto.'); return }
    try {
      await save.mutateAsync(editing)
      toast.success(editing.id ? 'Recompensa atualizada.' : 'Recompensa criada!')
      setEditing(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao salvar recompensa.'))
    }
  }

  const toggleActive = async (r: LoyaltyReward) => {
    try {
      await save.mutateAsync({
        id: r.id, name: r.name, description: r.description ?? '', type: r.type,
        serviceId: r.serviceId, productId: r.productId, cost: r.cost, isActive: !r.isActive,
      })
      toast.success(r.isActive ? 'Recompensa desativada.' : 'Recompensa ativada.')
    } catch { toast.error('Erro ao alterar recompensa.') }
  }

  const linkTo = (type: LoyaltyRewardType) => (type === 'Service' ? 'Serviço' : 'Produto')

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus size={16} /> Nova recompensa</Button>
      </div>

      {isLoading ? <ListSkeleton /> : !rewards?.length ? (
        <EmptyState icon={Gift} title="Monte seu catálogo de recompensas"
          action={<Button onClick={openNew}><Plus size={15} /> Criar a primeira</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(r => (
            <div key={r.id} className="ds-card space-y-3" style={{ opacity: r.isActive ? 1 : 0.55 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="ds-icon-chip ds-icon-chip-accent flex-shrink-0" style={{ width: 36, height: 36 }}>
                  {r.type === 'Service' ? <Tag size={16} /> : <Package size={16} />}
                </div>
                <button onClick={() => openEdit(r)} className="ds-icon-btn" aria-label="Editar"><Pencil size={14} /></button>
              </div>
              <div>
                <p className="ds-text-primary font-semibold">{r.name}</p>
                {r.description && <p className="ds-text-secondary mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{r.description}</p>}
                <p className="ds-text-disabled mt-1" style={{ fontSize: 'var(--text-xs)' }}>{linkTo(r.type)}: {r.linkedName ?? '—'}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="ds-text-accent font-bold inline-flex items-center gap-1">
                  <Star size={14} /> {r.cost} {unitLabel(mode, r.cost)}
                </span>
                <button onClick={() => toggleActive(r)} disabled={save.isPending}
                  style={{ fontSize: 'var(--text-xs)', color: r.isActive ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 500 }}>
                  {r.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar recompensa' : 'Nova recompensa'}>
        {editing && (
          <form onSubmit={submit} className="space-y-4">
            <div className="ds-field">
              <label className="ds-label">Nome</label>
              <input className="ds-input" value={editing.name} maxLength={150} required
                onChange={e => setEditing(f => f && ({ ...f, name: e.target.value }))} placeholder="Ex.: Corte grátis" />
            </div>
            <div className="ds-field">
              <label className="ds-label">Descrição (opcional)</label>
              <input className="ds-input" value={editing.description ?? ''} maxLength={500}
                onChange={e => setEditing(f => f && ({ ...f, description: e.target.value }))} placeholder="Ex.: Válida de segunda a quinta" />
            </div>

            <div className="ds-field">
              <label className="ds-label">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {([['Service', 'Serviço', Tag], ['Product', 'Produto', Package]] as const).map(([id, label, Icon]) => (
                  <button key={id} type="button"
                    onClick={() => setEditing(f => f && ({ ...f, type: id, serviceId: null, productId: null }))}
                    className="flex items-center justify-center gap-2 transition-colors"
                    style={{
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
                      border: editing.type === id ? '2px solid var(--tenant-primary)' : '1px solid var(--border-subtle)',
                      background: 'var(--bg-base)', cursor: 'pointer', color: 'var(--text-primary)',
                    }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ds-field">
              <label className="ds-label">{editing.type === 'Service' ? 'Serviço' : 'Produto'}</label>
              {editing.type === 'Service' ? (
                <select className="ds-input" value={editing.serviceId ?? ''} required
                  onChange={e => setEditing(f => f && ({ ...f, serviceId: e.target.value || null }))}>
                  <option value="">Escolha um serviço…</option>
                  {(services as Service[] | undefined)?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <select className="ds-input" value={editing.productId ?? ''} required
                  onChange={e => setEditing(f => f && ({ ...f, productId: e.target.value || null }))}>
                  <option value="">Escolha um produto…</option>
                  {(products as Product[] | undefined)?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="ds-field" style={{ maxWidth: 220 }}>
              <label className="ds-label">Custo ({unitLabel(mode, 2)})</label>
              <NumberField min={1} value={editing.cost} onChange={v => setEditing(f => f && ({ ...f, cost: v ?? 1 }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" className="flex-1" loading={save.isPending}>{editing.id ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

/* ================= Saldos ================= */
function BalancesTab({ mode }: { mode?: 'Points' | 'Visits' }) {
  const { data: balances, isLoading } = useLoyaltyBalances()

  if (isLoading) return <ListSkeleton />
  if (!balances?.length)
    return <EmptyState icon={Wallet} title="Nenhum cliente com saldo ainda"
      action={<p className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Os saldos aparecem conforme os atendimentos são concluídos.</p>} />

  return (
    <div className="ds-table-wrap">
      <div className="overflow-x-auto">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="hidden sm:table-cell">Telefone</th>
              <th className="text-center">Saldo</th>
              <th className="text-center hidden md:table-cell">Acumulado total</th>
            </tr>
          </thead>
          <tbody>
            {balances.map(b => (
              <tr key={b.clientId}>
                <td className="ds-text-primary font-medium">{b.clientName?.trim() || 'Sem nome'}</td>
                <td className="ds-text-secondary hidden sm:table-cell">{formatPhoneBR(b.phone)}</td>
                <td className="text-center">
                  <span className="ds-text-accent font-bold inline-flex items-center gap-1">
                    <Star size={13} /> {b.totalPoints} {unitLabel(mode, b.totalPoints)}
                  </span>
                </td>
                <td className="ds-text-secondary text-center hidden md:table-cell">{b.lifetimePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
