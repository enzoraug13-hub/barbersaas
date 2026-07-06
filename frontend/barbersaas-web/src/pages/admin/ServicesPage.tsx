import { useState } from 'react'
import { Plus, Trash2, Clock, DollarSign, Edit2, Eye, EyeOff } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { NumberField } from '../../components/ui/NumberField'
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
        <h2 className="ds-page-title">Serviços</h2>
        <Button onClick={openCreate}><Plus size={18} /> Novo Serviço</Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !services?.length ? (
        <EmptyState icon={Clock} title="Nenhum serviço cadastrado"
          action={<Button onClick={openCreate}>Cadastrar primeiro serviço</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <Card key={s.id} style={{ animationDelay: `${i * 45}ms` }} className="group animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: s.colorHex ?? '#c9a84c' }} />
                  <div className="min-w-0">
                    <p className="ds-text-primary font-semibold truncate">{s.name}</p>
                    {s.description && <p className="ds-text-disabled mt-0.5 line-clamp-1" style={{ fontSize: 'var(--text-xs)' }}>{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1" style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Editar">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1" style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }} title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <Clock size={14} />
                  {s.durationMinutes} min
                </div>
                <div className="ds-text-accent flex items-center gap-1.5 font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                  <DollarSign size={14} />
                  R$ {s.price.toFixed(2)}
                </div>
                <button
                  onClick={() => togglePublic(s)}
                  disabled={update.isPending}
                  title={s.showInPublicPage ? 'Visível para clientes — clique para ocultar' : 'Oculto dos clientes — clique para exibir'}
                  className="flex items-center gap-1 ml-auto disabled:opacity-50"
                  style={{
                    fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-md)', padding: '4px var(--space-2)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: s.showInPublicPage ? 'var(--color-success)' : 'var(--text-disabled)',
                  }}>
                  {s.showInPublicPage ? <><Eye size={13} /> Visível</> : <><EyeOff size={13} /> Oculto</>}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Serviço' : 'Novo Serviço'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="ds-field">
            <label className="ds-label">Nome</label>
            <input className="ds-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
          </div>
          <div className="ds-field">
            <label className="ds-label">Descrição</label>
            <input className="ds-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ds-field">
              <label className="ds-label">Duração (min)</label>
              <NumberField value={form.durationMinutes} onChange={v => setForm(f => ({...f, durationMinutes: v}))} min={5} placeholder="30" required />
            </div>
            <div className="ds-field">
              <label className="ds-label">Preço (R$)</label>
              <NumberField step="0.01" value={form.price} onChange={v => setForm(f => ({...f, price: v}))} min={0} placeholder="0,00" required />
            </div>
          </div>
          <div className="ds-field">
            <label className="ds-label">Cor</label>
            <input type="color" className="w-full cursor-pointer" style={{ height: 40, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }} value={form.colorHex} onChange={e => setForm(f => ({...f, colorHex: e.target.value}))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="public" checked={form.showInPublicPage} onChange={e => setForm(f => ({...f, showInPublicPage: e.target.checked}))} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
            <label htmlFor="public" className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Exibir na página pública</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={create.isPending || update.isPending}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
