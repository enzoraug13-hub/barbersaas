import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { useBarberSchedule, useUpdateSchedule } from '../../features/barbers/barbersApi'
import type { Barber } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const ORDER = [1, 2, 3, 4, 5, 6, 0] // mostra de segunda a domingo

type Shift = { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }

const DEFAULT_SHIFTS: Shift[] = [1, 2, 3, 4, 5].flatMap(d => [
  { dayOfWeek: d, startTime: '09:00', endTime: '12:00', isActive: true },
  { dayOfWeek: d, startTime: '13:00', endTime: '19:00', isActive: true },
])

const hhmm = (t: string) => (t ?? '').slice(0, 5)

/* Turnos de trabalho do barbeiro por dia da semana (dia sem turno = folga). */
export function ScheduleModal({ barber, onClose }: { barber: Barber; onClose: () => void }) {
  const { data: schedule, isLoading } = useBarberSchedule(barber.id)
  const update = useUpdateSchedule(barber.id)
  const [shifts, setShifts] = useState<Shift[] | null>(null)

  const current: Shift[] = shifts ?? (schedule?.shifts?.map(s => ({ ...s, startTime: hhmm(s.startTime), endTime: hhmm(s.endTime) })) ?? DEFAULT_SHIFTS)

  const updateShift = (idx: number, patch: Partial<Shift>) =>
    setShifts(current.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const addShift = (dayOfWeek: number) =>
    setShifts([...current, { dayOfWeek, startTime: '09:00', endTime: '18:00', isActive: true }])
  const removeShift = (idx: number) => setShifts(current.filter((_, i) => i !== idx))

  const handleSave = async () => {
    const invalid = current.find(s => s.isActive && s.endTime <= s.startTime)
    if (invalid) { toast.error(`${DAYS[invalid.dayOfWeek]}: o fim do turno precisa ser depois do início.`); return }
    try {
      await update.mutateAsync(current)
      toast.success('Horários salvos.')
      onClose()
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível salvar os horários.')) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Horários de trabalho" subtitle={barber.name} size="lg"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={update.isPending}>Salvar horários</Button>
      </>}>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="divide-y divide-[color:var(--line)]">
          {ORDER.map(day => {
            const dayShifts = current.map((s, i) => ({ s, i })).filter(x => x.s.dayOfWeek === day)
            return (
              <div key={day} className="py-3 first:pt-0 grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-x-3 gap-y-2 items-start">
                <p className="text-sm font-medium sm:pt-2.5">{DAYS[day]}</p>
                <div className="space-y-2 min-w-0">
                  {dayShifts.length === 0 && <p className="text-13 text-ink-3 sm:pt-2.5">Folga</p>}
                  {dayShifts.map(({ s, i }) => (
                    <div key={i} className="flex items-center gap-2" style={{ opacity: s.isActive ? 1 : 0.55 }}>
                      <input type="checkbox" className="ds-check" checked={s.isActive}
                        onChange={e => updateShift(i, { isActive: e.target.checked })}
                        aria-label={`Turno ${s.startTime} a ${s.endTime} ativo`} />
                      <input type="time" className="ds-input t-num" style={{ width: 104 }} value={s.startTime} step={300}
                        onChange={e => updateShift(i, { startTime: e.target.value })} aria-label="Início" />
                      <span className="text-13 text-ink-3">às</span>
                      <input type="time" className="ds-input t-num" style={{ width: 104 }} value={s.endTime} step={300}
                        onChange={e => updateShift(i, { endTime: e.target.value })} aria-label="Fim" />
                      <Button variant="ghost" icon size="sm" onClick={() => removeShift(i)} aria-label="Remover turno" className="ml-auto">
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addShift(day)} className="ds-link text-13 inline-flex items-center gap-1 no-underline">
                    <Plus size={14} /> Adicionar turno
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
