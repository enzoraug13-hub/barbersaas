import { useState } from 'react'
import { Plus, Loader2, Trash2, Clock, DollarSign, Edit2, X, Eye, EyeOff } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../../features/services/servicesApi'
import type { Service } from '../../types'
import toast from 'react-hot-toast'

const EMPTY_FORM = { name: '', description: '', durationMinutes: 30, price: 0, colorHex: '#c9a84c', showInPublicPage: true }

export default function ServicesPage() {
  const { data: services, isLoading } = useServices()
  const create  = useCreateService()
  const update  = useUpdateService()
  const remove  = useDeleteService()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      durationMinutes: s.durationMinutes,
      price: s.price,
      colorHex: s.colorHex ?? '#c9a84c',
      showInPublicPage: s.showInPublicPage,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form, description: form.description || undefined })
        toast.success('Serviço atualizado!')
      } else {
        await create.mutateAsync(form)
        toast.success('Serviço criado!')
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch { toast.error('Erro ao salvar serviço.') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este serviço?')) return
    try { await remove.mutateAsync(id); toast.success('Serviço excluído.') }
    catch { toast.error('Erro ao excluir.') }
  }

  // Alterna a visibilidade do serviço na página pública do cliente (1 clique → PUT /services/{id})
  const togglePublic = async (s: Service) => {
    try {
      await update.mutateAsync({
        id: s.id, name: s.name, description: s.description || undefined,
        durationMinutes: s.durationMinutes, price: s.price,
        colorHex: s.colorHex || undefined, showInPublicPage: !s.showInPublicPage,
      })
      toast.success(!s.showInPublicPage ? 'Agora visível para os clientes.' : 'Ocultado da página do cliente.')
    } catch { toast.error('Erro ao alterar visibilidade.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-content">Serviços</h2>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !services?.length ? (
        <EmptyState icon={Clock} title="Nenhum serviço cadastrado"
          action={<button onClick={openCreate} className="btn-primary">Cadastrar primeiro serviço</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <div key={s.id} style={{ animationDelay: `${i * 45}ms` }} className="card group hover:border-accent/40 transition-all animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: s.colorHex ?? '#c9a84c' }} />
                  <div className="min-w-0">
                    <p className="font-semibold text-content truncate">{s.name}</p>
                    {s.description && <p className="text-xs text-subtle mt-0.5 line-clamp-1">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => openEdit(s)} className="text-muted hover:text-content p-1" title="Editar">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300 p-1" title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-muted text-sm">
                  <Clock size={14} />
                  {s.durationMinutes} min
                </div>
                <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
                  <DollarSign size={14} />
                  R$ {s.price.toFixed(2)}
                </div>
                <button
                  onClick={() => togglePublic(s)}
                  disabled={update.isPending}
                  title={s.showInPublicPage ? 'Visível para clientes — clique para ocultar' : 'Oculto dos clientes — clique para exibir'}
                  className={`flex items-center gap-1 text-xs ml-auto rounded-lg px-2 py-1 transition-colors disabled:opacity-50 ${
                    s.showInPublicPage
                      ? 'text-success hover:bg-success/10'
                      : 'text-subtle hover:bg-surfaceHover hover:text-content'
                  }`}>
                  {s.showInPublicPage ? <><Eye size={13} /> Visível</> : <><EyeOff size={13} /> Oculto</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-content">{editing ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input className="input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duração (min)</label>
                  <input type="number" className="input" value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: +e.target.value}))} min={5} required />
                </div>
                <div>
                  <label className="label">Preço (R$)</label>
                  <input type="number" step="0.01" className="input" value={form.price} onChange={e => setForm(f => ({...f, price: +e.target.value}))} min={0} required />
                </div>
              </div>
              <div>
                <label className="label">Cor</label>
                <input type="color" className="w-full h-10 rounded-xl bg-surfaceHover border border-border cursor-pointer" value={form.colorHex} onChange={e => setForm(f => ({...f, colorHex: e.target.value}))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="public" checked={form.showInPublicPage} onChange={e => setForm(f => ({...f, showInPublicPage: e.target.checked}))} className="w-4 h-4 accent-accent" />
                <label htmlFor="public" className="text-sm text-muted">Exibir na página pública</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary flex-1">
                  {(create.isPending || update.isPending) && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
