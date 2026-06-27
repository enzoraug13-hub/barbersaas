import { useState } from 'react'
import { Plus, Target, Plus as PlusIcon, Check, Pencil, Trophy } from 'lucide-react'
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
  const [tab, setTab] = useState<'active' | 'completed' | 'all'>('active')
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
      const res = await contribute.mutateAsync({ id: contribGoal.id, amount: +amount })
      // A invalidação de ['goals'] (no hook) refaz a lista e a meta migra de aba sozinha.
      // Se esta contribuição concluiu a meta, comemora e leva o usuário pra aba Concluídas.
      if (res?.isCompleted) { toast.success('🎉 Meta concluída! Mandou bem!'); setTab('completed') }
      else toast.success('Contribuição adicionada!')
      setContribGoal(null); setAmount('')
    } catch { toast.error('Erro.') }
  }

  // Abas: Ativas | Concluídas | Todas. Concluída = status persistido OU alvo batido.
  const isDone = (g: Goal) => g.status === 'Completed' || g.isCompleted
  const counts = {
    active:    goals?.filter(g => !isDone(g)).length ?? 0,
    completed: goals?.filter(isDone).length ?? 0,
    all:       goals?.length ?? 0,
  }
  const filtered = (goals ?? []).filter(g =>
    tab === 'all' ? true : tab === 'completed' ? isDone(g) : !isDone(g))
  const tabs = [
    { key: 'active',    label: 'Ativas',     count: counts.active },
    { key: 'completed', label: 'Concluídas', count: counts.completed },
    { key: 'all',       label: 'Todas',      count: counts.all },
  ] as const

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
        <>
          {/* Abas: Ativas | Concluídas | Todas */}
          <div className="inline-flex gap-1 p-1" style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className="inline-flex items-center gap-1.5 transition-colors"
                style={{
                  padding: '6px var(--space-3)', borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)', fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: tab === t.key ? 'var(--bg-elevated)' : 'transparent',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
                }}>
                {t.label}
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 600, minWidth: 18, textAlign: 'center',
                  padding: '0 6px', borderRadius: 'var(--radius-full)',
                  background: tab === t.key ? 'var(--accent-soft)' : 'transparent',
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-disabled)',
                }}>{t.count}</span>
              </button>
            ))}
          </div>

          {!filtered.length ? (
            <EmptyState
              icon={tab === 'completed' ? Trophy : Target}
              title={tab === 'completed' ? 'Nenhuma meta concluída ainda' : 'Nenhuma meta ativa'}
              hint={tab === 'completed'
                ? 'Bata o alvo de uma meta para vê-la aqui como conquista.'
                : 'Crie uma nova meta ou contribua nas existentes para alcançar o alvo.'} />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((g, i) => {
              const done = isDone(g)
              return (
              <Card key={g.id} style={{
                animationDelay: `${i * 45}ms`,
                borderColor: done ? 'var(--color-success)' : undefined,
                // brilho sutil de conquista nas concluídas
                boxShadow: done ? '0 0 0 1px var(--color-success), 0 10px 30px -12px color-mix(in srgb, var(--color-success) 55%, transparent)' : undefined,
              }} className="space-y-4 animate-slide-up">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="ds-text-primary font-semibold inline-flex items-center gap-1.5">
                      {done && <Trophy size={15} style={{ color: 'var(--color-success)' }} />}
                      {g.name}
                    </p>
                    {g.description && <p className="ds-text-disabled mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{g.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={done ? 'success' : 'accent'}>
                      {done ? <span className="inline-flex items-center gap-1"><Check size={12} /> Concluída</span> : 'Ativa'}
                    </Badge>
                    {!done && (
                      <button type="button" aria-label="Editar meta" className="ds-text-disabled hover:ds-text-primary" onClick={() => openEdit(g)}>
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5" style={{ fontSize: 'var(--text-sm)' }}>
                    <span className="ds-text-secondary">{fmt(g.currentAmount)}</span>
                    <span className="font-semibold" style={{ color: done ? 'var(--color-success)' : 'var(--text-primary)' }}>
                      {done ? '100%' : `${g.percentageComplete.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="ds-progress-track" style={{ width: '100%' }}>
                    <div className="ds-progress-fill" style={{
                      width: `${done ? 100 : Math.min(100, g.percentageComplete)}%`,
                      background: done ? 'var(--color-success)' : undefined,
                      transition: 'width 500ms ease-out',
                    }} />
                  </div>
                  <div className="ds-text-disabled flex justify-between mt-1" style={{ fontSize: 'var(--text-xs)' }}>
                    <span>Meta: {fmt(g.targetAmount)}</span>
                    {done
                      ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-success)', fontWeight: 600 }}>Meta alcançada 🎉</span>
                      : <span>Falta: {fmt(g.remainingAmount)}</span>}
                  </div>
                </div>

                {!done && (
                  <Button variant="ghost" className="w-full" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setContribGoal(g)}>
                    <PlusIcon size={14} /> Contribuir
                  </Button>
                )}
              </Card>
              )
            })}
          </div>
          )}
        </>
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
