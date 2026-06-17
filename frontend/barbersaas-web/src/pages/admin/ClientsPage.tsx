import { useState } from 'react'
import { Search, Loader2, User, Phone, Star, Plus, X, Ban, CheckCircle } from 'lucide-react'
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
        <h2 className="text-xl font-bold text-content">Clientes</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{clients?.length ?? 0} clientes</span>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input
          className="input pl-10"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-accent" /></div>
      ) : !clients?.length ? (
        <div className="card text-center py-12">
          <User size={40} className="mx-auto text-subtle mb-3" />
          <p className="text-muted">Nenhum cliente encontrado</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Cadastrar cliente</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted font-medium px-6 py-4">Cliente</th>
                  <th className="text-left text-muted font-medium px-6 py-4 hidden sm:table-cell">Telefone</th>
                  <th className="text-center text-muted font-medium px-4 py-4 hidden md:table-cell">Visitas</th>
                  <th className="text-center text-muted font-medium px-4 py-4 hidden md:table-cell">Pontos</th>
                  <th className="text-center text-muted font-medium px-4 py-4">Status</th>
                  <th className="text-center text-muted font-medium px-4 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-surfaceHover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-content">{c.name}</p>
                          {c.email && <p className="text-xs text-subtle">{c.email}</p>}
                          <p className="text-xs text-subtle sm:hidden">{c.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted hidden sm:table-cell">
                      <div className="flex items-center gap-1.5"><Phone size={13} />{c.phoneNumber}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-muted hidden md:table-cell">{c.totalVisits}</td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1 text-accent">
                        <Star size={13} />{c.loyaltyPoints}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {c.isBlocked
                        ? <span className="badge-cancelled">Bloqueado</span>
                        : <span className="badge-confirmed">Ativo</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {c.isBlocked ? (
                        <button onClick={() => handleUnblock(c.id)} disabled={unblockClient.isPending}
                          className="btn-ghost py-1 px-2 text-xs gap-1 text-green-400 hover:text-green-300">
                          <CheckCircle size={13} /> Desbloquear
                        </button>
                      ) : (
                        <button onClick={() => { setBlock(c); setBlockReason('') }}
                          className="btn-ghost py-1 px-2 text-xs gap-1 text-red-400 hover:text-red-300">
                          <Ban size={13} /> Bloquear
                        </button>
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
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-content">Novo Cliente</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Nome</label><input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
              <div>
                <label className="label">Telefone (formato internacional)</label>
                <input className="input" placeholder="+5511999999999" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required />
              </div>
              <div><label className="label">E-mail (opcional)</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={createClient.isPending} className="btn-primary flex-1">
                  {createClient.isPending && <Loader2 size={16} className="animate-spin" />} Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal bloquear */}
      {blockTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setBlock(null)}>
          <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content mb-1">Bloquear Cliente</h3>
            <p className="text-accent font-medium mb-4">{blockTarget.name}</p>
            <form onSubmit={handleBlock} className="space-y-4">
              <div><label className="label">Motivo</label><input className="input" value={blockReason} onChange={e => setBlockReason(e.target.value)} required autoFocus /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBlock(null)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={blockClient.isPending} className="btn-danger flex-1">
                  {blockClient.isPending && <Loader2 size={16} className="animate-spin" />} Bloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
