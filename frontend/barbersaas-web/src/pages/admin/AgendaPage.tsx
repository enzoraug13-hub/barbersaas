import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, addDays, subDays, startOfWeek, isSameDay, isToday as isTodayFn, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, CalendarX2, Check, X, MessageCircle } from 'lucide-react'
import '../../styles/agenda.css'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input, Select, Field } from '../../components/ui/Input'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, BlockSkeleton } from '../../components/ui/Skeleton'
import { PhoneField } from '../../components/ui/PhoneField'
import { useAppointments, useCancelAppointment, useCompleteAppointment, useAdminCreateAppointment } from '../../features/appointments/appointmentsApi'
import { useBarbers } from '../../features/barbers/barbersApi'
import { useServices } from '../../features/services/servicesApi'
import { useSettings } from '../../features/settings/settingsApi'
import { toE164BR, isValidBRPhone, formatPhoneBR, onlyDigits } from '../../lib/masks'
import { brl, hhmm, toMinutes, statusOf, firstName, capFirst, WEEKDAY_SHORT } from '../../lib/format'
import { StatusMark } from '../../components/ui/StatusMark'
import { useIsDesktop } from '../../lib/useMediaQuery'
import type { Appointment, Barber, Service } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const PAYMENT_METHODS = [
  { value: 1, label: 'Pix' },
  { value: 0, label: 'Dinheiro' },
  { value: 2, label: 'Crédito' },
  { value: 3, label: 'Débito' },
  { value: 4, label: 'Outro' },
]

const EMPTY_APPT = { barberId: '', serviceId: '', clientName: '', clientPhone: '', clientEmail: '', date: '', startTime: '', notes: '' }

const PPM = 1.2               // pixels por minuto na grade (72px por hora)
const DEFAULT_COLOR = '#8A939B'
const isOpenStatus = (s: string) => s === 'Pending' || s === 'Confirmed'
const isOffStatus = (s: string) => s === 'Cancelled' || s === 'NoShow'
const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function AgendaPage() {
  const desktop = useIsDesktop()
  const [params, setParams] = useSearchParams()
  const [date, setDate]                 = useState(new Date())
  const [barberFilter, setBarberFilter] = useState('')
  const [selected, setSelected]         = useState<Appointment | null>(null)
  // Atalho do Início ("Novo agendamento" → /admin/agenda?novo=1) já abre o formulário.
  const [newAppt, setNewAppt]           = useState<typeof EMPTY_APPT | null>(() =>
    params.get('novo') ? { ...EMPTY_APPT, date: format(new Date(), 'yyyy-MM-dd') } : null)

  const dateStr = format(date, 'yyyy-MM-dd')
  const { data: appointments, isLoading } = useAppointments(dateStr, barberFilter || undefined)
  const { data: barbers }   = useBarbers()
  const { data: services }  = useServices()
  const { data: settings }  = useSettings()

  const openNew = (preset?: Partial<typeof EMPTY_APPT>) =>
    setNewAppt({ ...EMPTY_APPT, date: dateStr, barberId: barberFilter, ...preset })

  // Limpa o ?novo=1 da URL (para o voltar/recarregar não reabrir o formulário).
  useEffect(() => {
    if (!params.get('novo')) return
    params.delete('novo')
    setParams(params, { replace: true })
  }, [params, setParams])

  // Cor de cada serviço (a lista de agendamentos traz só o nome do serviço).
  const colorOf = useMemo(() => {
    const map = new Map((services ?? []).map(s => [s.name, s.colorHex || DEFAULT_COLOR]))
    return (name: string) => map.get(name) ?? DEFAULT_COLOR
  }, [services])

  const sorted = useMemo(
    () => [...(appointments ?? [])].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [appointments])
  const active = sorted.filter(a => !isOffStatus(a.status))
  const expected = active.reduce((s, a) => s + a.finalPrice, 0)

  const dayHours = settings?.businessHours?.find(h => h.dayOfWeek === date.getDay())
  const closed = dayHours ? !dayHours.isOpen : false

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        subtitle={capFirst(format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }))}
        actions={<>
          {!isTodayFn(date) && <Button variant="secondary" onClick={() => setDate(new Date())}>Hoje</Button>}
          <Button onClick={() => openNew()}><Plus size={16} /> <span className="lbl-long">Novo agendamento</span><span className="lbl-short">Novo</span></Button>
        </>} />

      <WeekStrip date={date} onChange={setDate} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BarberChips barbers={barbers} value={barberFilter} onChange={setBarberFilter} />
        {!!active.length && (
          <p className="text-13 text-ink-2">
            <span className="font-semibold text-ink t-num">{active.length}</span> {active.length === 1 ? 'atendimento' : 'atendimentos'} no dia,
            {' '}<span className="font-semibold text-ink t-num">{brl(expected)}</span>
          </p>
        )}
      </div>

      {closed && (
        <div className="ds-notice ds-notice-info">
          <CalendarX2 size={16} />
          <span>A barbearia está marcada como fechada neste dia da semana. Você ainda pode marcar horários manualmente.</span>
        </div>
      )}

      {desktop ? (
        isLoading || !barbers ? <BlockSkeleton height={480} /> : (
          <DayGrid
            date={date}
            appointments={sorted}
            barbers={barbers}
            barberFilter={barberFilter}
            hours={dayHours?.isOpen ? [dayHours.openTime, dayHours.closeTime] : null}
            closed={closed}
            colorOf={colorOf}
            onOpen={setSelected}
            onCreate={(barberId, min) => openNew({ barberId, startTime: minToHHMM(min) })}
          />
        )
      ) : (
        isLoading ? <ListSkeleton rows={4} /> : !sorted.length ? (
          <EmptyState boxed icon={CalendarX2} title="Nenhum horário marcado"
            hint={`Não há agendamentos para ${format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}.`}
            action={<Button variant="secondary" onClick={() => openNew()}><Plus size={16} /> Marcar horário</Button>} />
        ) : (
          <DayList date={date} appointments={sorted} colorOf={colorOf} onOpen={setSelected} />
        )
      )}

      {selected && <AppointmentDetail key={selected.id} appt={selected} onClose={() => setSelected(null)} />}

      <NewAppointmentModal value={newAppt} onChange={setNewAppt} onClose={() => setNewAppt(null)}
        barbers={barbers} services={services} />
    </div>
  )
}

/* ================= Faixa da semana ================= */
function WeekStrip({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date, { weekStartsOn: 1 }), i))
  return (
    <div className="wk">
      <Button variant="ghost" icon onClick={() => onChange(subDays(date, 7))} aria-label="Semana anterior"><ChevronLeft size={18} /></Button>
      <div className="wk-days">
        {days.map(d => (
          <button key={d.toISOString()} type="button" className="wk-day" onClick={() => onChange(d)}
            aria-pressed={isSameDay(d, date)} aria-current={isTodayFn(d) ? 'date' : undefined}
            aria-label={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}>
            <span className="wk-day-name">{WEEKDAY_SHORT[d.getDay()]}</span>
            <span className="wk-day-num">{format(d, 'd')}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" icon onClick={() => onChange(addDays(date, 7))} aria-label="Próxima semana"><ChevronRight size={18} /></Button>
    </div>
  )
}

/* ================= Filtro por barbeiro ================= */
function BarberChips({ barbers, value, onChange }: { barbers?: Barber[]; value: string; onChange: (id: string) => void }) {
  const list = (barbers ?? []).filter(b => b.isActive)
  if (list.length < 2) return <div />
  return (
    <div className="chips" role="group" aria-label="Filtrar por barbeiro">
      <button type="button" className="chip chip-text" aria-pressed={!value} onClick={() => onChange('')}>Todos</button>
      {list.map(b => (
        <button key={b.id} type="button" className="chip" aria-pressed={value === b.id} onClick={() => onChange(value === b.id ? '' : b.id)}>
          <Avatar name={b.name} src={b.photoUrl} size={24} />
          {firstName(b.name)}
        </button>
      ))}
    </div>
  )
}

/* ================= Grade do dia (desktop) ================= */
type Column = { key: string; barber?: Barber; name: string; appts: Appointment[] }

// Distribui agendamentos sobrepostos (mesmo barbeiro, mesmo horário) lado a lado.
function layoutColumn(appts: Appointment[]) {
  const out: { a: Appointment; lane: number; lanes: number }[] = []
  let cluster: Appointment[] = []
  let clusterEnd = -1
  const flush = () => {
    const ends: number[] = []
    const placed = cluster.map(a => {
      const s = toMinutes(a.startTime)
      let lane = ends.findIndex(e => e <= s)
      if (lane === -1) { lane = ends.length; ends.push(toMinutes(a.endTime)) } else ends[lane] = toMinutes(a.endTime)
      return { a, lane }
    })
    placed.forEach(p => out.push({ ...p, lanes: ends.length }))
    cluster = []
  }
  for (const a of appts) {
    if (cluster.length && toMinutes(a.startTime) >= clusterEnd) { flush(); clusterEnd = -1 }
    cluster.push(a)
    clusterEnd = Math.max(clusterEnd, toMinutes(a.endTime))
  }
  if (cluster.length) flush()
  return out
}

function DayGrid({ date, appointments, barbers, barberFilter, hours, closed, colorOf, onOpen, onCreate }: {
  date: Date
  appointments: Appointment[]
  barbers: Barber[]
  barberFilter: string
  hours: [string | null, string | null] | null
  closed: boolean
  colorOf: (service: string) => string
  onOpen: (a: Appointment) => void
  onCreate: (barberId: string, minute: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ col: string; min: number } | null>(null)
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })
  const today = isTodayFn(date)

  useEffect(() => {
    if (!today) return
    const t = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()) }, 30_000)
    return () => clearInterval(t)
  }, [today])

  // Colunas: barbeiros ativos (ou só o filtrado) + quem tiver agendamento no dia
  // mesmo inativo — a lista de agendamentos traz o nome, não o id do barbeiro.
  const columns: Column[] = useMemo(() => {
    const base = barbers.filter(b => (barberFilter ? b.id === barberFilter : b.isActive))
    const cols: Column[] = base.map(b => ({ key: b.id, barber: b, name: b.name, appts: [] }))
    for (const a of appointments) {
      let col = cols.find(c => c.name === a.barberName)
      if (!col) {
        const b = barbers.find(x => x.name === a.barberName)
        col = { key: b?.id ?? `n:${a.barberName}`, barber: b, name: a.barberName, appts: [] }
        cols.push(col)
      }
      col.appts.push(a)
    }
    return cols
  }, [appointments, barbers, barberFilter])

  // Faixa de horas: horário de funcionamento do dia (ou 08–20), ampliada para
  // caber qualquer agendamento fora dele, sempre em horas cheias.
  let start = hours?.[0] ? toMinutes(hours[0]) : 8 * 60
  let end = hours?.[1] ? toMinutes(hours[1]) : 20 * 60
  for (const a of appointments) { start = Math.min(start, toMinutes(a.startTime)); end = Math.max(end, toMinutes(a.endTime)) }
  start = Math.floor(start / 60) * 60
  end = Math.max(Math.ceil(end / 60) * 60, start + 4 * 60)
  const height = (end - start) * PPM
  const hoursList = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60)

  // Rola até o que interessa: agora (hoje) ou o primeiro atendimento.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = today ? nowMin - 60 : appointments.length ? toMinutes(appointments[0].startTime) - 30 : start
    el.scrollTop = Math.max(0, (target - start) * PPM)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toDateString()])

  if (!columns.length) {
    return <EmptyState boxed title="Nenhum barbeiro ativo" hint="Cadastre ou reative um barbeiro para usar a agenda." />
  }

  const minuteAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    return Math.min(end - 15, start + Math.floor(y / PPM / 15) * 15)
  }

  const colWidth = 'minmax(200px, 1fr)'

  return (
    <Panel pad={false} className="overflow-hidden">
      <div ref={scrollRef} className="ag-scroll">
        <div className="ag-grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, ${colWidth})`, minWidth: 64 + columns.length * 200 }}>
          {/* Cabeçalho */}
          <div className="ag-corner" />
          {columns.map(c => {
            const count = c.appts.filter(a => !isOffStatus(a.status)).length
            return (
              <div key={c.key} className="ag-head">
                <Avatar name={c.name} src={c.barber?.photoUrl} size={30} />
                <div className="min-w-0">
                  <p className="ag-head-name">{c.name}</p>
                  <p className="ag-head-sub">{count ? `${count} ${count === 1 ? 'horário' : 'horários'}` : 'Livre'}</p>
                </div>
              </div>
            )
          })}

          {/* Coluna de horas */}
          <div className="ag-times" style={{ height }}>
            {hoursList.map(m => (
              <span key={m} className="ag-time t-num" style={{ top: (m - start) * PPM }}>
                {m === start ? '' : minToHHMM(m)}
              </span>
            ))}
            {today && nowMin >= start && nowMin <= end && (
              <span className="ag-time ag-time-now t-num" style={{ top: (nowMin - start) * PPM }}>{minToHHMM(nowMin)}</span>
            )}
          </div>

          {/* Colunas dos barbeiros */}
          {columns.map((c, ci) => (
            <div key={c.key} className={`ag-col ${closed ? 'ag-closed' : ''}`} style={{ height }}
              onMouseMove={e => { if ((e.target as HTMLElement).closest('.ag-block')) { setHover(null); return } setHover({ col: c.key, min: minuteAt(e) }) }}
              onMouseLeave={() => setHover(null)}
              onClick={e => { if (c.barber && !(e.target as HTMLElement).closest('.ag-block')) onCreate(c.barber.id, minuteAt(e)) }}>
              {hoursList.map(m => (
                <span key={m} className="ag-line" style={{ top: (m - start) * PPM }} />
              ))}
              {hoursList.slice(0, -1).map(m => (
                <span key={`h${m}`} className="ag-line ag-line-half" style={{ top: (m + 30 - start) * PPM }} />
              ))}

              {hover?.col === c.key && c.barber && (
                <div className="ag-ghost" style={{ top: (hover.min - start) * PPM + 1, height: 15 * PPM * 2 - 2 }}>
                  <Plus size={13} className="mr-1" /> {minToHHMM(hover.min)}
                </div>
              )}

              {layoutColumn(c.appts).map(({ a, lane, lanes }) => {
                const s = toMinutes(a.startTime)
                const e = Math.max(toMinutes(a.endTime), s + 15)
                const h = (e - s) * PPM - 2
                const color = colorOf(a.serviceName)
                const st = statusOf(a.status)
                const cls = isOffStatus(a.status) ? 'is-off' : a.status === 'Completed' ? 'is-done' : a.status === 'Pending' ? 'is-pending' : ''
                const compact = h < 38
                return (
                  <button key={a.id} type="button" onClick={() => onOpen(a)}
                    className={`ag-block ${cls} ${compact ? 'is-compact' : ''}`}
                    title={`${hhmm(a.startTime)}–${hhmm(a.endTime)} ${a.clientName}, ${a.serviceName} (${st.label})`}
                    style={{
                      top: (s - start) * PPM + 1,
                      height: h,
                      left: `calc(${(lane / lanes) * 100}% + 4px)`,
                      width: `calc(${100 / lanes}% - 8px)`,
                      ['--stripe' as string]: color,
                      background: `color-mix(in srgb, ${color} 13%, var(--surface))`,
                    }}>
                    {compact ? (
                      <>
                        <span className="ag-block-time">{hhmm(a.startTime)}</span>
                        <span className="ag-block-name">{a.clientName}</span>
                      </>
                    ) : (
                      <>
                        <span className="ag-block-time">
                          {hhmm(a.startTime)}–{hhmm(a.endTime)}
                          {a.status === 'Completed' && <Check size={12} strokeWidth={2.5} className="text-ok" aria-label="Concluído" />}
                          {a.status === 'Pending' && <span className="text-warn font-medium">pendente</span>}
                        </span>
                        <span className="ag-block-name">{a.clientName || 'Cliente'}</span>
                        {h > 54 && <span className="ag-block-svc">{a.serviceName}</span>}
                      </>
                    )}
                  </button>
                )
              })}

              {today && nowMin >= start && nowMin <= end && (
                <div className={`ag-now ${ci === 0 ? 'ag-now-first' : ''}`} style={{ top: (nowMin - start) * PPM }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

/* ================= Lista do dia (celular) ================= */
function DayList({ date, appointments, colorOf, onOpen }: {
  date: Date; appointments: Appointment[]; colorOf: (s: string) => string; onOpen: (a: Appointment) => void
}) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const today = isTodayFn(date)
  // Linha do "agora" entre o que já passou e o que vem (só hoje).
  const nowIndex = today ? appointments.findIndex(a => toMinutes(a.startTime) > nowMin) : -1

  return (
    <div className="ds-panel">
      <ul className="ds-list">
        {appointments.map((a, i) => {
          const off = isOffStatus(a.status)
          return (
            <li key={a.id}>
              {i === nowIndex && <div className="ag-nowrow">Agora, {format(now, 'HH:mm')}</div>}
              <button type="button" className="ds-row" onClick={() => onOpen(a)}>
                <div className="w-[48px] flex-shrink-0">
                  <p className={`t-num font-semibold text-md leading-5 ${off ? 'text-ink-3 line-through' : ''}`}>{hhmm(a.startTime)}</p>
                  <p className="t-num text-xs text-ink-3">{hhmm(a.endTime)}</p>
                </div>
                <span className="ag-row-stripe" style={{ background: off ? 'var(--line-strong)' : colorOf(a.serviceName) }} />
                <div className="ds-row-main">
                  <p className={`ds-row-title ${off ? 'text-ink-3' : ''}`}>{a.clientName || 'Cliente'}</p>
                  <p className="ds-row-sub">{a.serviceName} com {firstName(a.barberName)}</p>
                </div>
                <StatusMark status={a.status} />
              </button>
            </li>
          )
        })}
        {today && nowIndex === -1 && appointments.length > 0 && (
          <li><div className="ag-nowrow">Agora, {format(now, 'HH:mm')}</div></li>
        )}
      </ul>
    </div>
  )
}

/* ================= Detalhe do agendamento ================= */
function AppointmentDetail({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const cancel   = useCancelAppointment()
  const complete = useCompleteAppointment()
  const [payMethod, setPayMethod] = useState(1)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const st = statusOf(appt.status)
  const open = isOpenStatus(appt.status)
  const day = parse(appt.date, 'dd/MM/yyyy', new Date())
  const dayLabel = Number.isNaN(day.getTime()) ? appt.date : format(day, "EEEE, d 'de' MMMM", { locale: ptBR })
  const phoneDigits = onlyDigits(appt.clientPhone ?? '')

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync({ id: appt.id, reason: 'Cancelado pelo administrador' })
      toast.success('Agendamento cancelado.')
      onClose()
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível cancelar.')) }
  }

  const handleComplete = async () => {
    try {
      await complete.mutateAsync({ id: appt.id, paymentMethod: payMethod })
      toast.success('Atendimento concluído.')
      onClose()
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível concluir.')) }
  }

  return (
    <Modal isOpen onClose={onClose} title={appt.clientName || 'Agendamento'}
      subtitle={`${capFirst(dayLabel)}, das ${hhmm(appt.startTime)} às ${hhmm(appt.endTime)}`}
      stackFooter
      footer={open ? (
        confirmCancel ? <>
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Voltar</Button>
          <Button variant="danger" onClick={handleCancel} loading={cancel.isPending}>Sim, cancelar horário</Button>
        </> : <>
          <Button variant="danger-ghost" onClick={() => setConfirmCancel(true)} className="sm:mr-auto"><X size={16} /> Cancelar horário</Button>
          <Button onClick={handleComplete} loading={complete.isPending}><Check size={16} /> Concluir atendimento</Button>
        </>
      ) : (
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      )}>
      <dl className="ds-dl">
        <div><dt>Status</dt><dd><Pill tone={st.tone}>{st.label}</Pill></dd></div>
        <div><dt>Serviço</dt><dd>{appt.serviceName}</dd></div>
        <div><dt>Barbeiro</dt><dd>{appt.barberName}</dd></div>
        <div><dt>Valor</dt><dd className="t-num">{brl(appt.finalPrice)}</dd></div>
        <div>
          <dt>Telefone</dt>
          <dd className="flex items-center gap-2 justify-end">
            <span className="t-num">{formatPhoneBR(appt.clientPhone)}</span>
            {phoneDigits.length >= 10 && (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer"
                className="ds-btn ds-btn-secondary ds-btn-sm" aria-label="Abrir conversa no WhatsApp">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
          </dd>
        </div>
        {appt.notes && <div><dt>Observações</dt><dd className="font-normal">{appt.notes}</dd></div>}
      </dl>

      {open && !confirmCancel && (
        <div className="mt-5">
          <p className="ds-label mb-2">Forma de pagamento</p>
          <div className="pay-grid" role="radiogroup" aria-label="Forma de pagamento">
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} type="button" role="radio" aria-checked={payMethod === m.value}
                aria-pressed={payMethod === m.value} className="ds-choice" onClick={() => setPayMethod(m.value)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {confirmCancel && (
        <p className="ds-notice ds-notice-bad mt-5">O cliente perde o horário e ele volta a ficar livre na agenda.</p>
      )}
    </Modal>
  )
}

/* ================= Novo agendamento ================= */
function NewAppointmentModal({ value, onChange, onClose, barbers, services }: {
  value: typeof EMPTY_APPT | null
  onChange: (v: typeof EMPTY_APPT) => void
  onClose: () => void
  barbers?: Barber[]
  services?: Service[]
}) {
  const createAppt = useAdminCreateAppointment()
  const [phoneError, setPhoneError] = useState<string | null>(null)
  if (!value) return null
  const form = value

  const set = (k: keyof typeof EMPTY_APPT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange({ ...form, [k]: e.target.value })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidBRPhone(form.clientPhone)) {
      setPhoneError('Telefone inválido. Informe DDD e número.')
      return
    }
    setPhoneError(null)
    try {
      await createAppt.mutateAsync({
        barberId: form.barberId,
        serviceId: form.serviceId,
        clientName: form.clientName,
        date: form.date,
        startTime: form.startTime + ':00',
        clientPhone: toE164BR(form.clientPhone),
        clientEmail: form.clientEmail || undefined,
        notes: form.notes || undefined,
      })
      toast.success('Horário marcado.')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível marcar o horário.'))
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Novo agendamento" size="lg"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="new-appt" loading={createAppt.isPending}>Marcar horário</Button>
      </>}>
      <form id="new-appt" onSubmit={handleCreate} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Barbeiro" value={form.barberId} onChange={set('barberId')} required>
            <option value="">Escolha o barbeiro</option>
            {barbers?.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Select label="Serviço" value={form.serviceId} onChange={set('serviceId')} required>
            <option value="">Escolha o serviço</option>
            {services?.filter(s => s.isActive).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min, {brl(s.price)})</option>
            ))}
          </Select>
          <Input label="Data" type="date" value={form.date} onChange={set('date')} required />
          <Input label="Horário" type="time" step={300} value={form.startTime} onChange={set('startTime')} required />
        </div>

        <fieldset className="space-y-4 pt-1">
          <legend className="text-md font-semibold">Cliente</legend>
          <Input label="Nome" value={form.clientName} onChange={set('clientName')} autoComplete="off" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneField label="Telefone" value={form.clientPhone} required
              onChange={d => { onChange({ ...form, clientPhone: d }); if (phoneError) setPhoneError(null) }}
              error={phoneError ?? undefined} />
            <Input label="E-mail" optional type="email" value={form.clientEmail} onChange={set('clientEmail')} />
          </div>
          <Field label="Observações" optional>
            <input className="ds-input" value={form.notes} onChange={set('notes')} placeholder="Ex.: prefere máquina 2 nas laterais" />
          </Field>
        </fieldset>
      </form>
    </Modal>
  )
}
