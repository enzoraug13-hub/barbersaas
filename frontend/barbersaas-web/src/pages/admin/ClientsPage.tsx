import { useState } from 'react'
import { Search, Plus, UserRound, MessageCircle, ChevronRight } from 'lucide-react'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { PhoneField } from '../../components/ui/PhoneField'
import { useClients, useCreateClient, useBlockClient, useUnblockClient } from '../../features/clients/clientsApi'
import { useLoyaltyProgram, unitLabel } from '../../features/loyalty/loyaltyApi'
import { useAuthStore } from '../../store/authStore'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { toE164BR, isValidBRPhone, formatPhoneBR, onlyDigits } from '../../lib/masks'
import { num } from '../../lib/format'
import type { Client } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

export default function ClientsPage() {
  const desktop = useIsDesktop()
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [selected, setSelected]   = useState<Client | null>(null)
  const [blockTarget, setBlock]   = useState<Client | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [form, setForm]           = useState({ name: '', phone: '', email: '' })
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const { data: clients, isLoading } = useClients(search || undefined)
  const createClient  = useCreateClient()
  const blockClient   = useBlockClient()
  const unblockClient = useUnblockClient()

  // Fidelidade desligada = visitas/saldo somem (regra do programa).
  const role = useAuthStore(s => s.user?.role?.toLowerCase())
  const { data: loyaltyProgram } = useLoyaltyProgram(role === 'owner' || role === 'admin')
  const loyaltyOn = !!loyaltyProgram?.isEnabled

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidBRPhone(form.phone)) {
      setPhoneError('Telefone inválido. Informe DDD e número.')
      return
    }
    setPhoneError(null)
    try {
      await createClient.mutateAsync({ name: form.name, phone: toE164BR(form.phone), email: form.email || undefined })
      toast.success('Cliente cadastrado.')
      setShowForm(false)
      setForm({ name: '', phone: '', email: '' })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível cadastrar o cliente.'))
    }
  }

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockTarget) return
    try {
      await blockClient.mutateAsync({ id: blockTarget.id, reason: blockReason })
      toast.success('Cliente bloqueado.')
      setBlock(null); setBlockReason(''); setSelected(null)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível bloquear.')) }
  }

  const handleUnblock = async (id: string) => {
    try {
      await unblockClient.mutateAsync(id)
      toast.success('Cliente desbloqueado.')
      setSelected(null)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível desbloquear.')) }
  }

  const count = clients?.length ?? 0
  const name = (c: Client) => c.name?.trim() || 'Sem nome'

  return (
    <div className="space-y-5">
      <PageHeader title="Clientes"
        subtitle={!search && clients ? `${num(count)} ${count === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}` : undefined}
        actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> <span className="lbl-long">Novo cliente</span><span className="lbl-short">Novo</span></Button>} />

      <div className="max-w-[440px]">
        <Input type="search" placeholder="Buscar por nome ou telefone" value={search} aria-label="Buscar cliente"
          onChange={e => setSearch(e.target.value)} leading={<Search size={16} />} />
      </div>

      {isLoading ? <ListSkeleton rows={6} /> : !clients?.length ? (
        search ? (
          <EmptyState boxed icon={Search} title={`Nenhum cliente encontrado para “${search}”`}
            hint="Confira a grafia ou busque pelo telefone com DDD." />
        ) : (
          <EmptyState boxed icon={UserRound} title="Nenhum cliente cadastrado"
            hint="Quem agenda pelo seu link entra aqui sozinho. Você também pode cadastrar à mão."
            action={<Button variant="secondary" onClick={() => setShowForm(true)}><Plus size={16} /> Cadastrar cliente</Button>} />
        )
      ) : desktop ? (
        <Panel pad={false}>
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  {loyaltyOn && <th className="ds-right">Visitas</th>}
                  {loyaltyOn && <th className="ds-right">Saldo</th>}
                  <th style={{ width: 40 }}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="ds-row-link" onClick={() => setSelected(c)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={name(c)} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium flex items-center gap-2">{name(c)} {c.isBlocked && <Pill tone="bad">Bloqueado</Pill>}</p>
                          {c.email && <p className="text-13 text-ink-3 truncate">{c.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="t-num ds-muted whitespace-nowrap">{formatPhoneBR(c.phoneNumber)}</td>
                    {loyaltyOn && <td className="ds-num">{num(c.totalVisits)}</td>}
                    {loyaltyOn && <td className="ds-num">{num(c.loyaltyPoints)} <span className="text-ink-3">{unitLabel(loyaltyProgram?.mode, c.loyaltyPoints)}</span></td>}
                    <td className="ds-right text-ink-3"><ChevronRight size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <ul className="ds-list">
            {clients.map(c => (
              <li key={c.id}>
                <button type="button" className="ds-row" onClick={() => setSelected(c)}>
                  <Avatar name={name(c)} size={36} />
                  <div className="ds-row-main">
                    <p className="ds-row-title">{name(c)}</p>
                    <p className="ds-row-sub t-num">{formatPhoneBR(c.phoneNumber)}</p>
                  </div>
                  {c.isBlocked && <Pill tone="bad">Bloqueado</Pill>}
                  <ChevronRight size={16} className="text-ink-3 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Detalhe do cliente */}
      <Modal isOpen={!!selected && !blockTarget} onClose={() => setSelected(null)} title={selected ? name(selected) : ''}
        subtitle={selected?.isBlocked ? 'Bloqueado para agendar pelo link' : undefined}
        footer={selected && (selected.isBlocked ? (
          <Button variant="secondary" onClick={() => handleUnblock(selected.id)} loading={unblockClient.isPending}>Desbloquear cliente</Button>
        ) : (
          <Button variant="danger-ghost" onClick={() => { setBlock(selected); setBlockReason('') }}>Bloquear cliente</Button>
        ))}>
        {selected && (
          <dl className="ds-dl">
            <div>
              <dt>Telefone</dt>
              <dd className="flex items-center gap-2 justify-end">
                <span className="t-num">{formatPhoneBR(selected.phoneNumber)}</span>
                {onlyDigits(selected.phoneNumber).length >= 10 && (
                  <a href={`https://wa.me/${onlyDigits(selected.phoneNumber)}`} target="_blank" rel="noopener noreferrer"
                    className="ds-btn ds-btn-secondary ds-btn-sm"><MessageCircle size={14} /> WhatsApp</a>
                )}
              </dd>
            </div>
            <div><dt>E-mail</dt><dd>{selected.email || <span className="text-ink-3 font-normal">Não informado</span>}</dd></div>
            {loyaltyOn && <div><dt>Visitas</dt><dd className="t-num">{num(selected.totalVisits)}</dd></div>}
            {loyaltyOn && <div><dt>Saldo de fidelidade</dt><dd className="t-num">{num(selected.loyaltyPoints)} {unitLabel(loyaltyProgram?.mode, selected.loyaltyPoints)}</dd></div>}
          </dl>
        )}
      </Modal>

      {/* Novo cliente */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo cliente"
        footer={<>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="new-client" loading={createClient.isPending}>Cadastrar</Button>
        </>}>
        <form id="new-client" onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoComplete="off" />
          <PhoneField label="Telefone" value={form.phone} required
            onChange={d => { setForm(f => ({ ...f, phone: d })); if (phoneError) setPhoneError(null) }}
            error={phoneError ?? undefined} />
          <Input label="E-mail" optional type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </form>
      </Modal>

      {/* Bloquear */}
      <Modal isOpen={!!blockTarget} onClose={() => setBlock(null)} title="Bloquear cliente"
        subtitle={blockTarget ? name(blockTarget) : undefined}
        footer={<>
          <Button variant="secondary" onClick={() => setBlock(null)}>Voltar</Button>
          <Button type="submit" form="block-client" variant="danger" loading={blockClient.isPending}>Bloquear</Button>
        </>}>
        <form id="block-client" onSubmit={handleBlock} className="space-y-4">
          <p className="text-sm text-ink-2">O cliente não consegue mais agendar pelo link. Você pode desbloquear quando quiser.</p>
          <Input label="Motivo" value={blockReason} onChange={e => setBlockReason(e.target.value)} required
            placeholder="Ex.: faltou três vezes sem avisar" hint="Fica registrado só para a equipe." />
        </form>
      </Modal>
    </div>
  )
}
