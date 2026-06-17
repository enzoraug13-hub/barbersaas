import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, X, CheckCircle, Plus, Calendar } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAppointments, useCancelAppointment, useCompleteAppointment, useAdminCreateAppointment } from '../../features/appointments/appointmentsApi'
import { useBarbers } from '../../features/barbers/barbersApi'
import { useServices } from '../../features/services/servicesApi'
import type { Appointment } from '../../types'
import toast from 'react-hot-toast'

const PAYMENT_METHODS = [
  { value: 0, label: 'Dinheiro' },
  { value: 1, label: 'Pix' },
  { value: 2, label: 'Crédito' },
  { value: 3, label: 'Débito' },
  { value: 4, label: 'Outro' },
]

const EMPTY_APPT = { barberId: '', serviceId: '', clientName: '', clientPhone: '', clientEmail: '', startTime: '', notes: '' }

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Pending: 'badge-pending', Confirmed: 'badge-confirmed',
    Completed: 'badge-completed', Cancelled: 'badge-cancelled', NoShow: 'badge-cancelled'
  }
  const label: Record<string, string> = {
    Pending: 'Pendente', Confirmed: 'Confirmado',
    Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu'
  }
  return <span className={map[s] ?? 'badge-pending'}>{label[s] ?? s}</span>
}

export default function AgendaPage() {
  const [date, setDate]           = useState(new Date())
  const [selected, setSelected]   = useState<Appointment | null>(null)
  const [payMethod, setPayMethod] = useState(1)
  const [showNew, setShowNew]     = useState(false)
  const [newAppt, setNewAppt]     = useState(EMPTY_APPT)
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: appointments, isLoading } = useAppointments(dateStr)
  const { data: barbers }   = useBarbers()
  const { data: services }  = useServices()
  const cancel              = useCancelAppointment()
  const complete            = useCompleteAppointment()
  const createAppt          = useAdminCreateAppointment()

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return
    try {
      await cancel.mutateAsync({ id, reason: 'Cancelado pelo administrador' })
      toast.success('Agendamento cancelado.')
      setSelected(null)
    } catch { toast.error('Erro ao cancelar.') }
  }

  const handleComplete = async (id: string) => {
    try {
      await complete.mutateAsync({ id, paymentMethod: payMethod })
      toast.success('Agendamento concluído!')
      setSelected(null)
    } catch { toast.error('Erro ao concluir.') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createAppt.mutateAsync({
        ...newAppt,
        date: dateStr,
        startTime: newAppt.startTime + ':00',
        clientEmail: newAppt.clientEmail || undefined,
        notes: newAppt.notes || undefined,
      })
      toast.success('Agendamento criado!')
      setShowNew(false)
      setNewAppt(EMPTY_APPT)
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao criar agendamento.')
    }
  }

  const setNew = (k: keyof typeof EMPTY_APPT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setNewAppt(f => ({ ...f, [k]: e.target.value }))

  const isActive = (s: string) => s !== 'Cancelled' && s !== 'Completed' && s !== 'NoShow'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-content">Agenda</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setDate(d => subDays(d, 1))} className="btn-ghost p-2">
            <ChevronLeft size={18} />
          </button>
          <span className="text-content font-medium text-sm px-2 capitalize">
            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
          <button onClick={() => setDate(d => addDays(d, 1))} className="btn-ghost p-2">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setDate(new Date())} className="btn-secondary text-xs px-3 py-2">
            Hoje
          </button>
          <button onClick={() => { setShowNew(true); setNewAppt(EMPTY_APPT) }} className="btn-primary">
            <Plus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <ListSkeleton />
      ) : !appointments?.length ? (
        <EmptyState icon={Calendar} title="Nenhum agendamento para este dia"
          action={<button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} /> Criar agendamento</button>} />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt, i) => (
            <div key={appt.id} style={{ animationDelay: `${i * 40}ms` }}
              className="card card-tap animate-slide-up"
              onClick={() => { setSelected(appt); setPayMethod(1) }}>
              <div className="flex items-start gap-4">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="text-lg font-bold text-accent">{appt.startTime}</p>
                  <p className="text-xs text-subtle">{appt.endTime}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-content">{appt.clientName}</p>
                      <p className="text-sm text-muted">{appt.serviceName} · {appt.barberName}</p>
                      <p className="text-xs text-subtle mt-0.5">{appt.clientPhone}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {statusBadge(appt.status)}
                      <p className="text-sm font-semibold text-content mt-1.5">
                        R$ {appt.finalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-content">Detalhes do Agendamento</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label: 'Cliente',  value: selected.clientName },
                { label: 'Telefone', value: selected.clientPhone },
                { label: 'Barbeiro', value: selected.barberName },
                { label: 'Serviço',  value: selected.serviceName },
                { label: 'Data',     value: `${selected.date} às ${selected.startTime}` },
                { label: 'Valor',    value: `R$ ${selected.finalPrice.toFixed(2)}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="text-muted">{row.label}</span>
                  <span className="text-content font-medium">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted">Status</span>
                {statusBadge(selected.status)}
              </div>
            </div>

            {isActive(selected.status) && (
              <>
                <div className="mb-4">
                  <label className="label text-xs">Forma de pagamento</label>
                  <select className="input" value={payMethod} onChange={e => setPayMethod(+e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleCancel(selected.id)} disabled={cancel.isPending} className="btn-danger flex-1">
                    {cancel.isPending ? <Loader2 size={15} className="animate-spin" /> : null} Cancelar
                  </button>
                  <button onClick={() => handleComplete(selected.id)} disabled={complete.isPending} className="btn-primary flex-1">
                    {complete.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Concluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal novo agendamento */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-content">Novo Agendamento</h3>
                <p className="text-xs text-subtle mt-0.5 capitalize">{format(date, "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
              <button onClick={() => setShowNew(false)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Barbeiro</label>
                <select className="input" value={newAppt.barberId} onChange={setNew('barberId')} required>
                  <option value="">-- Selecionar --</option>
                  {barbers?.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Serviço</label>
                <select className="input" value={newAppt.serviceId} onChange={setNew('serviceId')} required>
                  <option value="">-- Selecionar --</option>
                  {services?.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.durationMinutes}min — R$ {s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Horário</label>
                <input type="time" className="input" value={newAppt.startTime} onChange={setNew('startTime')} required />
              </div>
              <div><label className="label">Nome do cliente</label><input className="input" value={newAppt.clientName} onChange={setNew('clientName')} required /></div>
              <div>
                <label className="label">Telefone (ex: +5511999999999)</label>
                <input className="input" placeholder="+5511999999999" value={newAppt.clientPhone} onChange={setNew('clientPhone')} required />
              </div>
              <div><label className="label">E-mail (opcional)</label><input type="email" className="input" value={newAppt.clientEmail} onChange={setNew('clientEmail')} /></div>
              <div><label className="label">Observações</label><input className="input" value={newAppt.notes} onChange={setNew('notes')} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={createAppt.isPending} className="btn-primary flex-1">
                  {createAppt.isPending && <Loader2 size={16} className="animate-spin" />} Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
