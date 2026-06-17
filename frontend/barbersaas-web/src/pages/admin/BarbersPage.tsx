import { useState } from 'react'
import { Plus, Loader2, User, Clock, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useBarbers, useCreateBarber, useToggleBarber, useBarberSchedule, useUpdateSchedule } from '../../features/barbers/barbersApi'
import type { Barber } from '../../types'
import toast from 'react-hot-toast'

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const DEFAULT_SHIFTS = [1,2,3,4,5].flatMap(d => [
  { dayOfWeek: d, startTime: '09:00', endTime: '12:00', isActive: true },
  { dayOfWeek: d, startTime: '13:00', endTime: '19:00', isActive: true },
])

function ScheduleModal({ barber, onClose }: { barber: Barber; onClose: () => void }) {
  const { data: schedule, isLoading } = useBarberSchedule(barber.id)
  const update = useUpdateSchedule(barber.id)
  const [shifts, setShifts] = useState<Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }> | null>(null)

  const currentShifts = shifts ?? (schedule?.shifts ?? DEFAULT_SHIFTS)

  const updateShift = (idx: number, field: string, value: string | boolean) =>
    setShifts(currentShifts.map((s, i) => i === idx ? { ...s, [field]: value } : s))

  const addShift = (dayOfWeek: number) =>
    setShifts([...currentShifts, { dayOfWeek, startTime: '09:00', endTime: '18:00', isActive: true }])

  const removeShift = (idx: number) =>
    setShifts(currentShifts.filter((_, i) => i !== idx))

  const handleSave = async () => {
    try {
      await update.mutateAsync(currentShifts)
      toast.success('Horários salvos!')
      onClose()
    } catch { toast.error('Erro ao salvar horários.') }
  }

  const byDay = DAYS.map((_, d) => currentShifts.filter(s => s.dayOfWeek === d))

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-content">Horários — {barber.name}</h3>
            <p className="text-xs text-subtle mt-0.5">Configure os turnos de trabalho</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-content"><X size={20} /></button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-accent" /></div>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-4 pr-1">
            {DAYS.map((dayName, day) => (
              <div key={day} className="bg-surfaceHover/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-content">{dayName}</span>
                  <button onClick={() => addShift(day)} className="text-xs text-accent hover:text-accent flex items-center gap-1">
                    <Plus size={12} /> Turno
                  </button>
                </div>

                {byDay[day].length === 0 ? (
                  <p className="text-xs text-subtle italic">Folga / sem atendimento</p>
                ) : (
                  <div className="space-y-2">
                    {byDay[day].map((shift) => {
                      const globalIdx = currentShifts.indexOf(shift)
                      return (
                        <div key={globalIdx} className={`flex items-center gap-2 ${!shift.isActive ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={shift.isActive}
                            onChange={e => updateShift(globalIdx, 'isActive', e.target.checked)}
                            className="w-4 h-4 accent-accent flex-shrink-0"
                          />
                          <input type="time" className="input py-1.5 text-sm w-28 flex-shrink-0"
                            value={shift.startTime}
                            onChange={e => updateShift(globalIdx, 'startTime', e.target.value)} />
                          <span className="text-subtle text-sm">→</span>
                          <input type="time" className="input py-1.5 text-sm w-28 flex-shrink-0"
                            value={shift.endTime}
                            onChange={e => updateShift(globalIdx, 'endTime', e.target.value)} />
                          <button onClick={() => removeShift(globalIdx)} className="text-subtle hover:text-red-400 ml-auto flex-shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-4 pt-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={update.isPending} className="btn-primary flex-1">
            {update.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
            Salvar Horários
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BarbersPage() {
  const { data: barbers, isLoading } = useBarbers()
  const create = useCreateBarber()
  const toggle = useToggleBarber()
  const [showForm, setShowForm] = useState(false)
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', bio: '', commissionType: 0, commissionValue: 50, googleCalendarId: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create.mutateAsync(form)
      toast.success('Barbeiro cadastrado!')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', phone: '', bio: '', commissionType: 0, commissionValue: 50, googleCalendarId: '' })
    } catch { toast.error('Erro ao cadastrar.') }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'commissionType' || k === 'commissionValue' ? +e.target.value : e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-content">Barbeiros</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Novo Barbeiro
        </button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !barbers?.length ? (
        <EmptyState icon={User} title="Nenhum barbeiro cadastrado"
          action={<button onClick={() => setShowForm(true)} className="btn-primary">Cadastrar primeiro barbeiro</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {barbers.map((b, i) => (
            <div key={b.id} style={{ animationDelay: `${i * 45}ms` }} className="card group animate-slide-up">
              <div className="flex items-center gap-4">
                {b.photoUrl ? (
                  <img src={b.photoUrl} alt={b.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User size={24} className="text-accent" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content truncate">{b.name}</p>
                  {b.phone && <p className="text-xs text-subtle">{b.phone}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => toggle.mutate(b.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${b.isActive ? 'text-green-400' : 'text-subtle'}`}>
                      {b.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {b.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
              </div>

              {b.bio && <p className="text-xs text-subtle mt-3 line-clamp-2">{b.bio}</p>}

              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => setScheduleBarber(b)}
                  className="btn-ghost flex-1 text-xs py-2 gap-1.5">
                  <Clock size={14} /> Horários
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo barbeiro */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content mb-4">Novo Barbeiro</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Nome</label><input className="input" value={form.name} onChange={set('name')} required /></div>
              <div><label className="label">E-mail</label><input type="email" className="input" value={form.email} onChange={set('email')} required /></div>
              <div><label className="label">Senha</label><input type="password" className="input" value={form.password} onChange={set('password')} minLength={8} required /></div>
              <div><label className="label">Telefone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
              <div><label className="label">Bio</label><input className="input" value={form.bio} onChange={set('bio')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Comissão</label>
                  <select className="input" value={form.commissionType} onChange={set('commissionType')}>
                    <option value={0}>Percentual (%)</option>
                    <option value={1}>Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor</label>
                  <input type="number" className="input" value={form.commissionValue} onChange={set('commissionValue')} />
                </div>
              </div>
              <div><label className="label">ID do Google Calendar (opcional)</label><input className="input" value={form.googleCalendarId} onChange={set('googleCalendarId')} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">
                  {create.isPending && <Loader2 size={16} className="animate-spin" />} Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de horários */}
      {scheduleBarber && (
        <ScheduleModal barber={scheduleBarber} onClose={() => setScheduleBarber(null)} />
      )}
    </div>
  )
}
