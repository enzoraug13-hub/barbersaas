import { useState } from 'react'
import { Plus, Target, Plus as PlusIcon } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useGoals, useCreateGoal, useContributeGoal } from '../../features/goals/goalsApi'
import type { Goal } from '../../types'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals()
  const create     = useCreateGoal()
  const contribute = useContributeGoal()
  const [showForm, setShowForm] = useState(false)
  const [contribGoal, setContribGoal] = useState<Goal | null>(null)
  const [form, setForm] = useState({ name: '', description: '', targetAmount: 0, targetDate: '' })
  const [amount, setAmount] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create.mutateAsync({ ...form, targetDate: form.targetDate || undefined })
      toast.success('Meta criada!'); setShowForm(false)
    } catch { toast.error('Erro ao criar meta.') }
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
        <h2 className="text-xl font-bold text-content">Metas Financeiras</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> Nova Meta</button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !goals?.length ? (
        <EmptyState icon={Target} title="Nenhuma meta criada ainda" hint="Defina uma meta financeira para acompanhar seu progresso." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g, i) => (
            <div key={g.id} style={{ animationDelay: `${i * 45}ms` }} className="card space-y-4 animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-content">{g.name}</p>
                  {g.description && <p className="text-xs text-subtle mt-0.5">{g.description}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${g.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-accent/20 text-accent'}`}>
                  {g.isCompleted ? '✓ Concluída' : g.status}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted">{fmt(g.currentAmount)}</span>
                  <span className="text-content font-semibold">{g.percentageComplete.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-surfaceHover rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, g.percentageComplete)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-subtle mt-1">
                  <span>Meta: {fmt(g.targetAmount)}</span>
                  <span>Falta: {fmt(g.remainingAmount)}</span>
                </div>
              </div>

              {!g.isCompleted && (
                <button onClick={() => setContribGoal(g)} className="btn-secondary w-full text-xs py-2">
                  <PlusIcon size={14} /> Contribuir
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar meta */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content mb-4">Nova Meta</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Nome</label><input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
              <div><label className="label">Descrição</label><input className="input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
              <div><label className="label">Valor alvo (R$)</label><input type="number" step="0.01" className="input" value={form.targetAmount} onChange={e => setForm(f => ({...f, targetAmount: +e.target.value}))} required /></div>
              <div><label className="label">Data prevista</label><input type="date" className="input" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))} /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal contribuir */}
      {contribGoal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setContribGoal(null)}>
          <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content mb-1">Contribuir para</h3>
            <p className="text-accent font-medium mb-4">{contribGoal.name}</p>
            <form onSubmit={handleContrib} className="space-y-4">
              <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setContribGoal(null)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={contribute.isPending} className="btn-primary flex-1">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
