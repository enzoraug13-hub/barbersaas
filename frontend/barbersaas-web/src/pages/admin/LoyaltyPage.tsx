import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Gift, Plus, Pencil, Inbox, WalletCards, Check, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Input, Select, Field } from '../../components/ui/Input'
import { Tabs, Switch } from '../../components/ui/Controls'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { NumberField } from '../../components/ui/NumberField'
import {
  useLoyaltyProgram, useLoyaltyRewards, useSaveLoyaltyReward,
  useLoyaltyBalances, useLoyaltyRedemptions, useResolveRedemption, unitLabel,
} from '../../features/loyalty/loyaltyApi'
import type { LoyaltyReward, SaveRewardInput } from '../../features/loyalty/loyaltyApi'
import { useServices } from '../../features/services/servicesApi'
import { useProducts } from '../../features/products/productsApi'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { formatPhoneBR } from '../../lib/masks'
import { num } from '../../lib/format'
import type { Service, Product } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const when = (iso: string) => format(parseISO(iso), "d 'de' MMM, HH:mm", { locale: ptBR })

const statusLabel = { Pending: 'Aguardando entrega', Delivered: 'Entregue', Cancelled: 'Cancelado' } as const
const statusTone  = { Pending: 'warn', Delivered: 'ok', Cancelled: 'neutral' } as const

type Tab = 'resgates' | 'recompensas' | 'saldos'
type Mode = 'Points' | 'Visits' | undefined

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('resgates')
  const { data: program } = useLoyaltyProgram()
  const mode = program?.mode

  const { data: redemptions } = useLoyaltyRedemptions()
  const pendingCount = redemptions?.filter(r => r.status === 'Pending').length ?? 0

  return (
    <div className="space-y-5">
      <PageHeader title="Fidelidade"
        subtitle={mode === 'Visits'
          ? 'Cartão de cortes: cada atendimento concluído vale 1 corte.'
          : `Programa de pontos: cada R$ 1 gasto vale ${num(program?.pointsPerReal ?? 1)} ${unitLabel('Points', program?.pointsPerReal ?? 1)}.`}
        actions={<Link to="/admin/config?aba=fidelidade" className={btnClass('secondary')}>Regras do programa</Link>} />

      <Tabs value={tab} onChange={setTab} ariaLabel="Seções da fidelidade" options={[
        { value: 'resgates', label: 'Resgates', badge: pendingCount },
        { value: 'recompensas', label: 'Recompensas' },
        { value: 'saldos', label: 'Saldos dos clientes' },
      ]} />

      {tab === 'resgates'    && <RedemptionsTab mode={mode} />}
      {tab === 'recompensas' && <RewardsTab mode={mode} />}
      {tab === 'saldos'      && <BalancesTab mode={mode} />}
    </div>
  )
}

/* ================= Resgates ================= */
function RedemptionsTab({ mode }: { mode: Mode }) {
  const desktop = useIsDesktop()
  const { data: redemptions, isLoading } = useLoyaltyRedemptions()
  const resolve = useResolveRedemption()

  const act = async (id: string, deliver: boolean) => {
    try {
      await resolve.mutateAsync({ id, deliver })
      toast.success(deliver ? 'Resgate marcado como entregue.' : `Resgate cancelado. O saldo voltou para o cliente.`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível resolver o resgate.'))
    }
  }

  if (isLoading) return <ListSkeleton />
  if (!redemptions?.length)
    return <EmptyState boxed icon={Inbox} title="Nenhum resgate ainda" hint="Quando um cliente trocar o saldo por uma recompensa, o pedido aparece aqui para você entregar." />

  // Pendentes primeiro — são os que pedem ação.
  const sorted = [...redemptions].sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1))

  const actions = (id: string) => (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="secondary" onClick={() => act(id, true)} disabled={resolve.isPending}><Check size={14} /> Entregue</Button>
      <Button size="sm" variant="ghost" onClick={() => act(id, false)} disabled={resolve.isPending}><X size={14} /> Cancelar</Button>
    </div>
  )

  return desktop ? (
    <Panel pad={false}>
      <div className="ds-table-scroll">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Recompensa</th>
              <th className="ds-right">Custo</th>
              <th>Pedido em</th>
              <th>Situação</th>
              <th className="ds-right"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.id}>
                <td>
                  <p className="font-medium">{r.clientName}</p>
                  <p className="text-13 text-ink-3 t-num">{formatPhoneBR(r.clientPhone)}</p>
                </td>
                <td>{r.rewardName}</td>
                <td className="ds-num">{num(r.costPaid)} <span className="text-ink-3">{unitLabel(mode, r.costPaid)}</span></td>
                <td className="ds-muted whitespace-nowrap">{when(r.requestedAt)}</td>
                <td><Pill tone={statusTone[r.status]}>{statusLabel[r.status]}</Pill></td>
                <td><div className="flex justify-end">{r.status === 'Pending' && actions(r.id)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  ) : (
    <Panel pad={false}>
      <ul className="ds-list">
        {sorted.map(r => (
          <li key={r.id} className="px-4 py-3 border-b border-line last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.clientName}</p>
                <p className="text-13 text-ink-2">{r.rewardName}, {num(r.costPaid)} {unitLabel(mode, r.costPaid)}</p>
                <p className="text-xs text-ink-3 mt-0.5">{when(r.requestedAt)}</p>
              </div>
              {r.status !== 'Pending' && <Pill tone={statusTone[r.status]}>{statusLabel[r.status]}</Pill>}
            </div>
            {r.status === 'Pending' && <div className="mt-3">{actions(r.id)}</div>}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* ================= Recompensas ================= */
const emptyForm: SaveRewardInput = { name: '', description: '', type: 'Service', serviceId: null, productId: null, cost: 10, isActive: true }

function RewardsTab({ mode }: { mode: Mode }) {
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
      toast.success(editing.id ? 'Recompensa atualizada.' : 'Recompensa criada.')
      setEditing(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar a recompensa.'))
    }
  }

  const toggleActive = async (r: LoyaltyReward) => {
    try {
      await save.mutateAsync({
        id: r.id, name: r.name, description: r.description ?? '', type: r.type,
        serviceId: r.serviceId, productId: r.productId, cost: r.cost, isActive: !r.isActive,
      })
      toast.success(r.isActive ? `${r.name} saiu do catálogo.` : `${r.name} voltou ao catálogo.`)
    } catch { toast.error('Não foi possível alterar a recompensa.') }
  }

  const sorted = [...(rewards ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.cost - b.cost)

  return (
    <>
      <Panel title="Catálogo de recompensas" description="O que o cliente pode trocar pelo saldo, na área dele." split={!!sorted.length} pad={false}
        actions={<Button size="sm" onClick={openNew}><Plus size={15} /> Nova recompensa</Button>}>
        {isLoading ? <ListSkeleton rows={3} boxed={false} /> : !sorted.length ? (
          <EmptyState icon={Gift} title="Nenhuma recompensa cadastrada" hint="Ex.: um corte grátis a cada 10 cortes, ou uma pomada por 8." />
        ) : (
          <ul className="ds-list">
            {sorted.map(r => (
              <li key={r.id} className="ds-row" style={{ opacity: r.isActive ? 1 : 0.6 }}>
                <div className="ds-row-main">
                  <p className="ds-row-title">{r.name}</p>
                  <p className="ds-row-sub">{r.type === 'Service' ? 'Serviço' : 'Produto'}: {r.linkedName ?? 'não vinculado'}{r.description ? `. ${r.description}` : ''}</p>
                </div>
                <span className="t-num font-semibold whitespace-nowrap">{num(r.cost)} <span className="text-ink-3 font-normal">{unitLabel(mode, r.cost)}</span></span>
                <Switch checked={r.isActive} onChange={() => toggleActive(r)} disabled={save.isPending} label={`${r.name} disponível`} />
                <Button variant="ghost" size="sm" icon onClick={() => openEdit(r)} aria-label={`Editar ${r.name}`}><Pencil size={15} /></Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar recompensa' : 'Nova recompensa'}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
          <Button type="submit" form="reward-form" loading={save.isPending}>{editing?.id ? 'Salvar' : 'Criar recompensa'}</Button>
        </>}>
        {editing && (
          <form id="reward-form" onSubmit={submit} className="space-y-4">
            <Input label="Nome" value={editing.name} maxLength={150} required placeholder="Ex.: Corte grátis"
              onChange={e => setEditing(f => f && ({ ...f, name: e.target.value }))} />
            <Input label="Descrição" optional value={editing.description ?? ''} maxLength={500} placeholder="Ex.: Vale de segunda a quinta"
              onChange={e => setEditing(f => f && ({ ...f, description: e.target.value }))} />
            <Field label="O cliente ganha">
              <div className="grid grid-cols-2 gap-2">
                {([['Service', 'Um serviço'], ['Product', 'Um produto']] as const).map(([id, label]) => (
                  <button key={id} type="button" className="ds-choice items-center text-sm font-medium" aria-pressed={editing.type === id}
                    onClick={() => setEditing(f => f && ({ ...f, type: id, serviceId: null, productId: null }))}>
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            {editing.type === 'Service' ? (
              <Select label="Serviço" value={editing.serviceId ?? ''} required
                onChange={e => setEditing(f => f && ({ ...f, serviceId: e.target.value || null }))}>
                <option value="">Escolha o serviço</option>
                {(services as Service[] | undefined)?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            ) : (
              <Select label="Produto" value={editing.productId ?? ''} required
                onChange={e => setEditing(f => f && ({ ...f, productId: e.target.value || null }))}>
                <option value="">Escolha o produto</option>
                {(products as Product[] | undefined)?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
            <Field label={`Custo em ${unitLabel(mode, 2)}`} className="max-w-[200px]">
              <NumberField min={1} value={editing.cost} onChange={v => setEditing(f => f && ({ ...f, cost: v || 1 }))} />
            </Field>
          </form>
        )}
      </Modal>
    </>
  )
}

/* ================= Saldos ================= */
function BalancesTab({ mode }: { mode: Mode }) {
  const desktop = useIsDesktop()
  const { data: balances, isLoading } = useLoyaltyBalances()

  if (isLoading) return <ListSkeleton />
  if (!balances?.length)
    return <EmptyState boxed icon={WalletCards} title="Nenhum cliente com saldo ainda" hint="O saldo cresce sozinho conforme os atendimentos são concluídos." />

  const sorted = [...balances].sort((a, b) => b.totalPoints - a.totalPoints)

  return (
    <Panel pad={false}>
      {desktop ? (
        <div className="ds-table-scroll">
          <table className="ds-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th className="ds-right">Saldo atual</th>
                <th className="ds-right">Total acumulado</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(b => (
                <tr key={b.clientId}>
                  <td><div className="flex items-center gap-3"><Avatar name={b.clientName} size={30} /><span className="font-medium">{b.clientName?.trim() || 'Sem nome'}</span></div></td>
                  <td className="ds-muted t-num">{formatPhoneBR(b.phone)}</td>
                  <td className="ds-num font-semibold">{num(b.totalPoints)} <span className="text-ink-3 font-normal">{unitLabel(mode, b.totalPoints)}</span></td>
                  <td className="ds-num ds-muted">{num(b.lifetimePoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="ds-list">
          {sorted.map(b => (
            <li key={b.clientId} className="ds-row">
              <Avatar name={b.clientName} size={34} />
              <div className="ds-row-main">
                <p className="ds-row-title">{b.clientName?.trim() || 'Sem nome'}</p>
                <p className="ds-row-sub t-num">{formatPhoneBR(b.phone)}</p>
              </div>
              <span className="t-num font-semibold">{num(b.totalPoints)} <span className="text-ink-3 font-normal">{unitLabel(mode, b.totalPoints)}</span></span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
