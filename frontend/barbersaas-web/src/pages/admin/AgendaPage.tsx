import { useState } from 'react'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CheckCircle, Plus, Calendar } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useAppointments, useCancelAppointment, useCompleteAppointment, useAdminCreateAppointment } from '../../features/appointments/appointmentsApi'
import { useBarbers } from '../../features/barbers/barbersApi'
import { useServices } from '../../features/services/servicesApi'
import { PhoneField } from '../../components/ui/PhoneField'
import { toE164BR, isValidBRPhone, formatPhoneBR } from '../../lib/masks'
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
  const variant: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
    Pending: 'warning', Confirmed: 'info', Completed: 'success', Cancelled: 'error', NoShow: 'error'
  }
  const label: Record<string, string> = {
    Pending: 'Pendente', Confirmed: 'Confirmado',
    Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu'
  }
  return <Badge variant={variant[s] ?? 'warning'}>{label[s] ?? s}</Badge>
}

export default function AgendaPage() {
  const [date, setDate]           = useState(new Date())
  const [barberFilter, setBarberFilter] = useState('')
  const [selected, setSelected]   = useState<Appointment | null>(null)
  const [payMethod, setPayMethod] = useState(1)
  const [showNew, setShowNew]     = useState(false)
  const [newAppt, setNewAppt]     = useState(EMPTY_APPT)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const dateStr = format(date, 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i))

  const { data: appointments, isLoading } = useAppointments(dateStr, barberFilter || undefined)
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
    if (!isValidBRPhone(newAppt.clientPhone)) {
      setPhoneError('Telefone inválido. Informe DDD + número.')
      return
    }
    setPhoneError(null)
    try {
      await createAppt.mutateAsync({
        ...newAppt,
        date: dateStr,
        startTime: newAppt.startTime + ':00',
        clientPhone: toE164BR(newAppt.clientPhone),
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
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '32px', color: 'var(--text-primary)' }}>Agenda</h2>
          <p className="ds-text-secondary mt-1 capitalize" style={{ fontSize: '13px' }}>{format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="ds-input ds-agenda-filter" style={{ width: 180, background: 'var(--bg-subtle)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
            value={barberFilter} onChange={e => setBarberFilter(e.target.value)}>
            <option value="">Todos os barbeiros</option>
            {barbers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="ghost" style={{ color: 'var(--text-secondary)' }} onClick={() => setDate(new Date())}>Hoje</Button>
          <Button style={{ fontWeight: 600 }} onClick={() => { setShowNew(true); setNewAppt(EMPTY_APPT) }}><Plus size={16} /> Novo</Button>
        </div>
      </div>

      {/* Calendário semanal */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" onClick={() => setDate(d => subDays(d, 7))}><ChevronLeft size={16} /></Button>
        <div className="flex-1 grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map(d => {
            const active = isSameDay(d, date)
            return (
              <button key={d.toISOString()} onClick={() => setDate(d)} className={`ds-week-day ${active ? 'ds-week-day-active' : ''}`}>
                <span className="ds-week-day-label capitalize">{format(d, 'EEE', { locale: ptBR })}</span>
                <span className="ds-week-day-number">{format(d, 'dd')}</span>
              </button>
            )
          })}
        </div>
        <Button variant="ghost" onClick={() => setDate(d => addDays(d, 7))}><ChevronRight size={16} /></Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <ListSkeleton />
      ) : !appointments?.length ? (
        <EmptyState icon={Calendar} title="Nenhum agendamento" hint="Clique em + Novo para criar" className="ds-empty-elegant"
          action={<Button onClick={() => setShowNew(true)} style={{ height: 34, padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' }}><Plus size={14} /> Criar agendamento</Button>} />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt, i) => (
            <Card key={appt.id} interactive style={{ animationDelay: `${i * 40}ms` }}
              className="animate-slide-up"
              onClick={() => { setSelected(appt); setPayMethod(1) }}>
              <div className="flex items-start gap-4">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="ds-text-accent font-bold" style={{ fontSize: 'var(--text-lg)' }}>{appt.startTime}</p>
                  <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{appt.endTime}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="ds-text-primary font-semibold">{appt.clientName}</p>
                      <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{appt.serviceName} · {appt.barberName}</p>
                      <p className="ds-text-disabled mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{formatPhoneBR(appt.clientPhone)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {statusBadge(appt.status)}
                      <p className="ds-text-primary font-semibold mt-1.5" style={{ fontSize: 'var(--text-sm)' }}>
                        R$ {appt.finalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal detalhe */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detalhes do Agendamento">
        {selected && (
          <>
            <div className="space-y-2 mb-4">
              {[
                { label: 'Cliente',  value: selected.clientName },
                { label: 'Telefone', value: formatPhoneBR(selected.clientPhone) },
                { label: 'Barbeiro', value: selected.barberName },
                { label: 'Serviço',  value: selected.serviceName },
                { label: 'Data',     value: `${selected.date} às ${selected.startTime}` },
                { label: 'Valor',    value: `R$ ${selected.finalPrice.toFixed(2)}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1 last:border-0" style={{ fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="ds-text-secondary">{row.label}</span>
                  <span className="ds-text-primary font-medium">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between py-1" style={{ fontSize: 'var(--text-sm)' }}>
                <span className="ds-text-secondary">Status</span>
                {statusBadge(selected.status)}
              </div>
            </div>

            {isActive(selected.status) && (
              <>
                <div className="ds-field mb-4">
                  <label className="ds-label">Forma de pagamento</label>
                  <select className="ds-input" value={payMethod} onChange={e => setPayMethod(+e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button variant="danger" className="flex-1" onClick={() => handleCancel(selected.id)} loading={cancel.isPending}>Cancelar</Button>
                  <Button className="flex-1" onClick={() => handleComplete(selected.id)} loading={complete.isPending}><CheckCircle size={15} /> Concluir</Button>
                </div>
              </>
            )}
          </>
        )}
      </Modal>

      {/* Modal novo agendamento */}
      <Modal isOpen={showNew} onClose={() => setShowNew(false)} title="Novo Agendamento">
        <p className="ds-text-disabled capitalize" style={{ fontSize: 'var(--text-xs)', marginTop: -8, marginBottom: 16 }}>{format(date, "dd 'de' MMMM", { locale: ptBR })}</p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="ds-field">
            <label className="ds-label">Barbeiro</label>
            <select className="ds-input" value={newAppt.barberId} onChange={setNew('barberId')} required>
              <option value="">-- Selecionar --</option>
              {barbers?.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label">Serviço</label>
            <select className="ds-input" value={newAppt.serviceId} onChange={setNew('serviceId')} required>
              <option value="">-- Selecionar --</option>
              {services?.filter(s => s.isActive).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.durationMinutes}min — R$ {s.price.toFixed(2)}</option>
              ))}
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label">Horário</label>
            <input type="time" className="ds-input" value={newAppt.startTime} onChange={setNew('startTime')} required />
          </div>
          <div className="ds-field"><label className="ds-label">Nome do cliente</label><input className="ds-input" value={newAppt.clientName} onChange={setNew('clientName')} required /></div>
          <PhoneField label="Telefone" value={newAppt.clientPhone} required
            onChange={d => { setNewAppt(f => ({ ...f, clientPhone: d })); if (phoneError) setPhoneError(null) }}
            error={phoneError ?? undefined} />
          <div className="ds-field"><label className="ds-label">E-mail (opcional)</label><input type="email" className="ds-input" value={newAppt.clientEmail} onChange={setNew('clientEmail')} /></div>
          <div className="ds-field"><label className="ds-label">Observações</label><input className="ds-input" value={newAppt.notes} onChange={setNew('notes')} /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={createAppt.isPending}>Agendar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
