import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, User, Clock, ToggleLeft, ToggleRight, X, Pencil, ChevronRight } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { EditBarberModal } from '../../components/admin/EditBarberModal'
import { useBarbers, useCreateBarber, useToggleBarber, useBarberSchedule, useUpdateSchedule } from '../../features/barbers/barbersApi'
import { PhoneField } from '../../components/ui/PhoneField'
import { toE164BR, formatPhoneBR } from '../../lib/masks'
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
    <Modal isOpen onClose={onClose} title={`Horários — ${barber.name}`} subtitle="Configure os turnos de trabalho"
      panelClassName="max-w-2xl" panelStyle={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>
      ) : (
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {DAYS.map((dayName, day) => (
            <div key={day} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)' }}>{dayName}</span>
                <button onClick={() => addShift(day)} className="ds-text-accent flex items-center gap-1" style={{ fontSize: 'var(--text-xs)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Plus size={12} /> Turno
                </button>
              </div>

              {byDay[day].length === 0 ? (
                <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>Folga / sem atendimento</p>
              ) : (
                <div className="space-y-2">
                  {byDay[day].map((shift) => {
                    const globalIdx = currentShifts.indexOf(shift)
                    return (
                      <div key={globalIdx} className="flex items-center gap-2" style={{ opacity: shift.isActive ? 1 : 0.5 }}>
                        <input
                          type="checkbox"
                          checked={shift.isActive}
                          onChange={e => updateShift(globalIdx, 'isActive', e.target.checked)}
                          className="w-4 h-4 flex-shrink-0"
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        <input type="time" className="ds-input flex-shrink-0" style={{ width: 112, height: 32, fontSize: 'var(--text-sm)' }}
                          value={shift.startTime}
                          onChange={e => updateShift(globalIdx, 'startTime', e.target.value)} />
                        <span className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>→</span>
                        <input type="time" className="ds-input flex-shrink-0" style={{ width: 112, height: 32, fontSize: 'var(--text-sm)' }}
                          value={shift.endTime}
                          onChange={e => updateShift(globalIdx, 'endTime', e.target.value)} />
                        <button onClick={() => removeShift(globalIdx)} className="ml-auto flex-shrink-0" style={{ color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
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

      <div className="flex gap-3 mt-4 pt-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSave} loading={update.isPending}>Salvar Horários</Button>
      </div>
    </Modal>
  )
}

export default function BarbersPage() {
  const navigate = useNavigate()
  const { data: barbers, isLoading } = useBarbers()
  const create = useCreateBarber()
  const toggle = useToggleBarber()
  const [showForm, setShowForm] = useState(false)
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null)
  const [editBarber, setEditBarber] = useState<Barber | null>(null)
  // Google Calendar não entra mais aqui: a conexão é por OAuth no perfil do barbeiro.
  const EMPTY_FORM = { name: '', phone: '', bio: '', commissionType: 0, commissionValue: 50 }
  const [form, setForm] = useState(EMPTY_FORM)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await create.mutateAsync({ ...form, phone: form.phone ? toE164BR(form.phone) : undefined })
      toast.success('Barbeiro cadastrado!')
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch { toast.error('Erro ao cadastrar.') }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: k === 'commissionType' || k === 'commissionValue' ? +e.target.value : e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="ds-page-title">Barbeiros</h2>
        <Button onClick={() => setShowForm(true)}><Plus size={18} /> Novo Barbeiro</Button>
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !barbers?.length ? (
        <EmptyState icon={User} title="Nenhum barbeiro cadastrado"
          action={<Button onClick={() => setShowForm(true)}>Cadastrar primeiro barbeiro</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {barbers.map((b, i) => (
            <Card key={b.id} style={{ animationDelay: `${i * 45}ms` }} className="animate-slide-up">
              <div role="button" tabIndex={0} onClick={() => navigate(`/admin/barbeiros/${b.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/barbeiros/${b.id}`) }}
                className="flex items-center gap-4 group" style={{ cursor: 'pointer' }}>
                {b.photoUrl ? (
                  <img src={b.photoUrl} alt={b.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="ds-icon-chip ds-icon-chip-accent" style={{ width: 56, height: 56, borderRadius: '50%' }}>
                    <User size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="ds-text-primary font-semibold truncate group-hover:ds-text-accent transition-colors">{b.name}</p>
                  {b.phone && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{formatPhoneBR(b.phone)}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggle.mutate(b.id) }}
                      className="flex items-center gap-1 font-medium"
                      style={{ fontSize: 'var(--text-xs)', color: b.isActive ? 'var(--color-success)' : 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {b.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {b.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
                <ChevronRight size={18} className="flex-shrink-0 ds-text-disabled group-hover:ds-text-accent transition-colors" />
              </div>

              {b.bio && <p className="ds-text-disabled mt-3 line-clamp-2" style={{ fontSize: 'var(--text-xs)' }}>{b.bio}</p>}

              <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <Button variant="ghost" className="flex-1" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setEditBarber(b)}>
                  <Pencil size={14} /> Editar
                </Button>
                <Button variant="ghost" className="flex-1" style={{ fontSize: 'var(--text-xs)' }} onClick={() => setScheduleBarber(b)}>
                  <Clock size={14} /> Horários
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal novo barbeiro */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo Barbeiro" panelClassName="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.name} onChange={set('name')} required /></div>
          <PhoneField label="Telefone (opcional)" value={form.phone} onChange={d => setForm(f => ({ ...f, phone: d }))} />
          <div className="ds-field"><label className="ds-label">Bio</label><input className="ds-input" value={form.bio} onChange={set('bio')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ds-field">
              <label className="ds-label">Comissão</label>
              <select className="ds-input" value={form.commissionType} onChange={set('commissionType')}>
                <option value={0}>Percentual (%)</option>
                <option value={1}>Fixo (R$)</option>
              </select>
            </div>
            <div className="ds-field">
              <label className="ds-label">Valor</label>
              <input type="number" className="ds-input" value={form.commissionValue} onChange={set('commissionValue')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={create.isPending}>Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar barbeiro */}
      {editBarber && (
        <EditBarberModal barber={editBarber} onClose={() => setEditBarber(null)} />
      )}

      {/* Modal de horários */}
      {scheduleBarber && (
        <ScheduleModal barber={scheduleBarber} onClose={() => setScheduleBarber(null)} />
      )}
    </div>
  )
}
