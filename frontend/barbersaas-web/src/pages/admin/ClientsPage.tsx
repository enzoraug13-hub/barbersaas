import { useState } from 'react'
import { Search, User, Phone, Star, Plus, Ban, CheckCircle } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useClients, useCreateClient, useBlockClient, useUnblockClient } from '../../features/clients/clientsApi'
import type { Client } from '../../types'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [blockTarget, setBlock]   = useState<Client | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [form, setForm]           = useState({ name: '', phone: '', email: '' })

  const { data: clients, isLoading } = useClients(search || undefined)
  const createClient  = useCreateClient()
  const blockClient   = useBlockClient()
  const unblockClient = useUnblockClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createClient.mutateAsync({ name: form.name, phone: form.phone, email: form.email || undefined })
      toast.success('Cliente cadastrado!')
      setShowForm(false)
      setForm({ name: '', phone: '', email: '' })
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao cadastrar cliente.')
    }
  }

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockTarget) return
    try {
      await blockClient.mutateAsync({ id: blockTarget.id, reason: blockReason })
      toast.success('Cliente bloqueado.')
      setBlock(null); setBlockReason('')
    } catch { toast.error('Erro ao bloquear.') }
  }

  const handleUnblock = async (id: string) => {
    try {
      await unblockClient.mutateAsync(id)
      toast.success('Cliente desbloqueado.')
    } catch { toast.error('Erro ao desbloquear.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="ds-page-title">Clientes</h2>
        <div className="flex items-center gap-3">
          <span className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{clients?.length ?? 0} clientes</span>
          <Button onClick={() => setShowForm(true)}><Plus size={18} /> Novo Cliente</Button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
        <input
          className="ds-input pl-10"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !clients?.length ? (
        <EmptyState icon={User} title="Nenhum cliente encontrado"
          action={<Button onClick={() => setShowForm(true)}>Cadastrar cliente</Button>} />
      ) : (
        <div className="ds-table-wrap">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="hidden sm:table-cell">Telefone</th>
                  <th className="text-center hidden md:table-cell">Visitas</th>
                  <th className="text-center hidden md:table-cell">Pontos</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="ds-avatar flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', fontSize: 'var(--text-sm)' }}>
                          {(c.name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="ds-text-primary font-medium">{c.name?.trim() || 'Sem nome'}</p>
                          {c.email && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{c.email}</p>}
                          <p className="ds-text-disabled sm:hidden" style={{ fontSize: 'var(--text-xs)' }}>{c.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="ds-text-secondary hidden sm:table-cell">
                      <div className="flex items-center gap-1.5"><Phone size={13} />{c.phoneNumber}</div>
                    </td>
                    <td className="ds-text-secondary text-center hidden md:table-cell">{c.totalVisits}</td>
                    <td className="text-center hidden md:table-cell">
                      <div className="ds-text-accent flex items-center justify-center gap-1">
                        <Star size={13} />{c.loyaltyPoints}
                      </div>
                    </td>
                    <td className="text-center">
                      {c.isBlocked
                        ? <Badge variant="error">Bloqueado</Badge>
                        : <Badge variant="info">Ativo</Badge>}
                    </td>
                    <td className="text-center">
                      {c.isBlocked ? (
                        <Button variant="ghost" onClick={() => handleUnblock(c.id)} disabled={unblockClient.isPending}
                          style={{ height: 28, padding: '0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                          <CheckCircle size={13} /> Desbloquear
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => { setBlock(c); setBlockReason('') }}
                          style={{ height: 28, padding: '0 var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                          <Ban size={13} /> Bloquear
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
          <div className="ds-field">
            <label className="ds-label">Telefone (formato internacional)</label>
            <input className="ds-input" placeholder="+5511999999999" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required />
          </div>
          <div className="ds-field"><label className="ds-label">E-mail (opcional)</label><input type="email" className="ds-input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={createClient.isPending}>Cadastrar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal bloquear */}
      <Modal isOpen={!!blockTarget} onClose={() => setBlock(null)} title="Bloquear Cliente">
        {blockTarget && (
          <>
            <p className="ds-text-accent font-medium mb-4">{blockTarget.name?.trim() || 'Sem nome'}</p>
            <form onSubmit={handleBlock} className="space-y-4">
              <div className="ds-field"><label className="ds-label">Motivo</label><input className="ds-input" value={blockReason} onChange={e => setBlockReason(e.target.value)} required autoFocus /></div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setBlock(null)}>Cancelar</Button>
                <Button type="submit" variant="danger" className="flex-1" loading={blockClient.isPending}>Bloquear</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
