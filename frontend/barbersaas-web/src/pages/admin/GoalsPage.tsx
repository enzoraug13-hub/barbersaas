import { useState } from 'react'
import { Plus, Target, Plus as PlusIcon, Check, Pencil } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useGoals, useCreateGoal, useUpdateGoal, useContributeGoal } from '../../features/goals/goalsApi'
import type { Goal } from '../../types'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const emptyForm = { name: '', description: '', targetAmount: 0, targetDate: '' }

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const create     = useCreateGoal()
  const update     = useUpdateGoal()
  const contribute = useContributeGoal()
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [contribGoal, setContribGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [amount, setAmount] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create.mutateAsync({ ...form, targetDate: form.targetDate || undefined })
      toast.success('Meta criada!'); setShowForm(false); setForm(emptyForm)
    } catch { toast.error('Erro ao criar meta.') }
  }

  const openEdit = (g: Goal) => {
    setForm({ name: g.name, description: g.description ?? '', targetAmount: g.targetAmount, targetDate: g.targetDate ?? '' })
    setEditGoal(g)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGoal) return
    try {
      await update.mutateAsync({ id: editGoal.id, ...form, targetDate: form.targetDate || undefined })
      toast.success('Meta atualizada!'); setEditGoal(null); setForm(emptyForm)
    } catch { toast.error('Erro ao atualizar meta.') }
  }

  const handleContrib = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contribGoal) return
    try {
      await contribute.mutateAsync({ id: contribGoal.id, amount: +amount })
      toast.success('Contribuição adicionada!'); setContribGoal(null); setAmount('')
    } catch { toast.error('Erro.') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="ds-page-title">Metas Financeiras</h2>
        <Button onClick={() => setShowForm(true)}><Plus size={18} /> Nova Meta</Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !goals?.length ? (
        <EmptyState icon={Target} title="Nenhuma meta criada ainda" hint="Defina uma meta financeira para acompanhar seu progresso." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g, i) => (
            <Card key={g.id} style={{ animationDelay: `${i * 45}ms` }} className="space-y-4 animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <p className="ds-text-primary font-semibold">{g.name}</p>
                  {g.description && <p className="ds-text-disabled mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{g.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={g.isCompleted ? 'success' : 'accent'}>
                    {g.isCompleted ? <span className="inline-flex items-center gap-1"><Check size={12} /> Concluída</span> : g.status}
                  </Badge>
                  <button type="button" aria-label="Editar meta" className="ds-text-disabled hover:ds-text-primary" onClick={() => openEdit(g)}>
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5" style={{ fontSize: 'var(--text-sm)' }}>
                  <span className="ds-text-secondary">{fmt(g.currentAmount)}</span>
                  <span className="ds-text-primary font-semibold">{g.percentageComplete.toFixed(1)}%</span>
                </div>
                <div className="ds-progress-track" style={{ width: '100%' }}>
                  <div className="ds-progress-fill" style={{ width: `${Math.min(100, g.percentageComplete)}%`, transition: 'width 500ms ease-out' }} />
                </div>
                <div className="ds-text-disabled flex justify-between mt-1" style={{ fontSize: 'var(--text-xs)' }}>
                  <span>Meta: {fmt(g.targetAmount)}</span>
                  <span>Falta: {fmt(g.remainingAmount)}</span>
                </div>
              </div>

              {!g.isCompleted && (
                <Button variant="ghost" className="w-full" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setContribGoal(g)}>
                  <PlusIcon size={14} /> Contribuir
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal criar meta */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nova Meta">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
          <div className="ds-field"><label className="ds-label">Descrição</label><input className="ds-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          <div className="ds-field"><label className="ds-label">Valor alvo (R$)</label><input type="number" step="0.01" className="ds-input" value={form.targetAmount} onChange={e => setForm(f => ({...f, targetAmount: +e.target.value}))} required /></div>
          <div className="ds-field"><label className="ds-label">Data prevista</label><input type="date" className="ds-input" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))} /></div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={create.isPending}>Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar meta */}
      <Modal isOpen={!!editGoal} onClose={() => setEditGoal(null)} title="Editar Meta">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
          <div className="ds-field"><label className="ds-label">Descrição</label><input className="ds-input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
          <div className="ds-field"><label className="ds-label">Valor alvo (R$)</label><input type="number" step="0.01" className="ds-input" value={form.targetAmount} onChange={e => setForm(f => ({...f, targetAmount: +e.target.value}))} required /></div>
          <div className="ds-field"><label className="ds-label">Data prevista</label><input type="date" className="ds-input" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))} /></div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditGoal(null)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={update.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal contribuir */}
      <Modal isOpen={!!contribGoal} onClose={() => setContribGoal(null)} title="Contribuir para">
        {contribGoal && (
          <>
            <p className="ds-text-accent font-medium mb-4">{contribGoal.name}</p>
            <form onSubmit={handleContrib} className="space-y-4">
              <div className="ds-field"><label className="ds-label">Valor (R$)</label><input type="number" step="0.01" className="ds-input" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus /></div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setContribGoal(null)}>Cancelar</Button>
                <Button type="submit" className="flex-1" loading={contribute.isPending}>Confirmar</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
