import { useState } from 'react'
import { Plus, Target, Pencil, CircleCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Field } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Controls'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { NumberField } from '../../components/ui/NumberField'
import { useGoals, useCreateGoal, useUpdateGoal, useContributeGoal } from '../../features/goals/goalsApi'
import { brl } from '../../lib/format'
import type { Goal } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const emptyForm = { name: '', description: '', targetAmount: 0, targetDate: '' }
const fmtDate = (d?: string) => { if (!d) return null; try { return format(parseISO(d), "d 'de' MMM 'de' yyyy", { locale: ptBR }) } catch { return d } }

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

  const openCreate = () => { setForm(emptyForm); setEditGoal(null); setShowForm(true) }
  const openEdit = (g: Goal) => {
    setForm({ name: g.name, description: g.description ?? '', targetAmount: g.targetAmount, targetDate: g.targetDate ?? '' })
    setEditGoal(g); setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editGoal) {
        await update.mutateAsync({ id: editGoal.id, ...form, targetDate: form.targetDate || undefined })
        toast.success('Meta atualizada.')
      } else {
        await create.mutateAsync({ ...form, targetDate: form.targetDate || undefined })
        toast.success('Meta criada.')
      }
      setShowForm(false); setEditGoal(null); setForm(emptyForm)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível salvar a meta.')) }
  }

  const handleContrib = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contribGoal) return
    try {
      const res = await contribute.mutateAsync({ id: contribGoal.id, amount: +amount })
      // Se esta contribuição bateu o alvo, a meta muda de aba: leva o usuário até ela.
      if (res?.isCompleted) { toast.success(`Meta “${contribGoal.name}” atingida.`); setTab('completed') }
      else toast.success(`${brl(+amount)} guardados em “${contribGoal.name}”.`)
      setContribGoal(null); setAmount('')
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível registrar o valor.')) }
  }

  // Concluída = status persistido OU alvo batido.
  const isDone = (g: Goal) => g.status === 'Completed' || g.isCompleted
  const counts = {
    active:    goals?.filter(g => !isDone(g)).length ?? 0,
    completed: goals?.filter(isDone).length ?? 0,
    all:       goals?.length ?? 0,
  }
  const filtered = (goals ?? []).filter(g => (tab === 'all' ? true : tab === 'completed' ? isDone(g) : !isDone(g)))

  return (
    <div className="space-y-5">
      <PageHeader title="Metas"
        subtitle="Reserve dinheiro para os planos da barbearia e acompanhe quanto falta."
        actions={<Button onClick={openCreate}><Plus size={16} /> <span className="lbl-long">Nova meta</span><span className="lbl-short">Nova</span></Button>} />

      {isLoading ? <ListSkeleton rows={3} /> : !goals?.length ? (
        <EmptyState boxed icon={Target} title="Nenhuma meta criada"
          hint="Ex.: reformar a fachada, comprar uma cadeira nova ou montar uma reserva de emergência."
          action={<Button variant="secondary" onClick={openCreate}><Plus size={16} /> Criar meta</Button>} />
      ) : (
        <>
          <Segmented value={tab} onChange={setTab} ariaLabel="Filtrar metas" options={[
            { value: 'active', label: 'Em andamento', count: counts.active },
            { value: 'completed', label: 'Atingidas', count: counts.completed },
            { value: 'all', label: 'Todas', count: counts.all },
          ]} />

          {!filtered.length ? (
            <EmptyState boxed title={tab === 'completed' ? 'Nenhuma meta atingida ainda' : 'Nenhuma meta em andamento'}
              hint={tab === 'completed' ? 'Quando uma meta bater o valor, ela aparece aqui.' : 'Crie uma meta nova para começar a guardar.'} />
          ) : (
            <Panel pad={false}>
              <ul className="ds-list">
                {filtered.map(g => {
                  const done = isDone(g)
                  const pct = done ? 100 : Math.min(100, g.percentageComplete)
                  const due = fmtDate(g.targetDate)
                  return (
                    <li key={g.id} className="px-5 py-5 border-b border-line last:border-b-0 max-lg:px-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-md font-semibold flex items-center gap-2">
                            {done && <CircleCheck size={18} className="text-ok flex-shrink-0" aria-label="Atingida" />}
                            {g.name}
                          </p>
                          {(g.description || due) && (
                            <p className="text-13 text-ink-2 mt-0.5">
                              {g.description}{g.description && due ? '. ' : ''}{due && `Prazo: ${due}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!done && <Button variant="secondary" size="sm" onClick={() => { setContribGoal(g); setAmount('') }}><Plus size={14} /> Guardar</Button>}
                          {!done && <Button variant="ghost" size="sm" icon onClick={() => openEdit(g)} aria-label={`Editar ${g.name}`}><Pencil size={15} /></Button>}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <p className="text-sm">
                          <span className="t-num text-[22px] leading-7 font-semibold" style={{ fontStretch: 'var(--stretch-numeric)' }}>{brl(g.currentAmount)}</span>
                          <span className="text-ink-2"> de {brl(g.targetAmount)}</span>
                        </p>
                        <p className="text-13 text-ink-2 t-num">{done ? 'Meta atingida' : `Faltam ${brl(g.remainingAmount)}`}</p>
                      </div>
                      <div className={`ds-progress mt-2 ${done ? 'ds-progress-ok' : 'ds-progress-accent'}`} style={{ height: 8 }}
                        role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name}: ${Math.round(pct)}%`}>
                        <span style={{ width: `${pct}%`, transition: 'width 400ms ease-out' }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editGoal ? 'Editar meta' : 'Nova meta'}
        footer={<>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="goal-form" loading={create.isPending || update.isPending}>{editGoal ? 'Salvar' : 'Criar meta'}</Button>
        </>}>
        <form id="goal-form" onSubmit={handleSave} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex.: Reforma da fachada" />
          <Input label="Descrição" optional value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor da meta (R$)">
              <NumberField step="0.01" value={form.targetAmount} onChange={v => setForm(f => ({ ...f, targetAmount: v }))} placeholder="0,00" required />
            </Field>
            <Input label="Prazo" optional type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!contribGoal} onClose={() => setContribGoal(null)} title="Guardar dinheiro" subtitle={contribGoal?.name}
        footer={<>
          <Button variant="secondary" onClick={() => setContribGoal(null)}>Cancelar</Button>
          <Button type="submit" form="contrib-form" loading={contribute.isPending}>Guardar</Button>
        </>}>
        <form id="contrib-form" onSubmit={handleContrib} className="space-y-4">
          {contribGoal && <p className="text-sm text-ink-2">Faltam <span className="font-semibold text-ink t-num">{brl(contribGoal.remainingAmount)}</span> para atingir a meta.</p>}
          <Input label="Valor (R$)" type="number" step="0.01" min="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0,00" />
        </form>
      </Modal>
    </div>
  )
}
