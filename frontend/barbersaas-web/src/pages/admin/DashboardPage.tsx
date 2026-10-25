import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Plus, Scissors, CalendarX2 } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, subDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDashboard, useMonthlyRevenue, useBarberPerformance, type BarberPerformance } from '../../features/dashboard/dashboardApi'
import { useAppointments } from '../../features/appointments/appointmentsApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Ledger } from '../../components/ui/Ledger'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { btnClass } from '../../components/ui/btnClass'
import { EmptyState } from '../../components/ui/EmptyState'
import { LedgerSkeleton, ListSkeleton, BlockSkeleton } from '../../components/ui/Skeleton'
import { chartAxisTick, chartGridStroke, chartBarCursor, barFills, CHART_MAIN, CHART_SECOND } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'
import { PublicLinkButtons } from '../../components/admin/PublicLinkButtons'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl, brlCompact, num, hhmm, toMinutes, capFirst } from '../../lib/format'
import { StatusMark } from '../../components/ui/StatusMark'
import type { Appointment } from '../../types'

const pctChange = (curr: number, prev: number | undefined) =>
  prev === undefined || prev === 0 ? undefined : ((curr - prev) / prev) * 100

// índice 0 = segunda … 6 = domingo (mesmo do backend)
const mondayFirst = (d: Date) => (d.getDay() + 6) % 7
const ACTIVE = new Set(['Pending', 'Confirmed'])

export default function DashboardPage() {
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthName = format(today, 'MMMM', { locale: ptBR })

  const { data, isLoading } = useDashboard(format(startOfMonth(today), 'yyyy-MM-dd'), format(endOfMonth(today), 'yyyy-MM-dd'))
  const prevMonth = subMonths(today, 1)
  const { data: prevData } = useDashboard(format(startOfMonth(prevMonth), 'yyyy-MM-dd'), format(endOfMonth(prevMonth), 'yyyy-MM-dd'))
  const { data: todayAppts, isLoading: loadingToday } = useAppointments(todayStr)
  const { data: monthly } = useMonthlyRevenue(6)
  const { data: barberPerf, isLoading: loadingPerf } = useBarberPerformance(format(subDays(today, 6), 'yyyy-MM-dd'), todayStr)

  // Últimos 7 dias, um ponto por dia terminando hoje. Para uma janela de 7 dias,
  // cada dia da semana aparece uma vez — então a soma do "weeklyAppointments" de
  // todos os barbeiros é exatamente o total de agendamentos daquele dia.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i)
    const idx = mondayFirst(d)
    return {
      label: format(d, 'EEEEEE', { locale: ptBR }),
      full: format(d, "EEEE, d 'de' MMMM", { locale: ptBR }),
      isToday: isSameDay(d, today),
      count: (barberPerf ?? []).reduce((s, b) => s + (b.weeklyAppointments[idx] ?? 0), 0),
    }
  })
  const hasWeek = week.some(d => d.count > 0)

  const monthlyData = monthly?.map(m => ({ ...m, label: format(new Date(`${m.month}-01T12:00:00`), 'MMM', { locale: ptBR }) }))
  const hasMonthly = monthlyData?.some(m => m.revenue > 0 || m.expense > 0) ?? false

  // Hoje: ordenado por horário; o próximo atendimento ainda por vir ganha destaque.
  const nowMin = today.getHours() * 60 + today.getMinutes()
  const sortedToday = [...(todayAppts ?? [])].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const nextId = sortedToday.find(a => ACTIVE.has(a.status) && toMinutes(a.endTime) > nowMin)?.id
  const doneToday = sortedToday.filter(a => a.status === 'Completed').length
  // No Início interessa o que ainda vem: horários em aberto a partir de agora
  // (a agenda completa do dia fica na Agenda). Sem nada por vir, mostra o dia todo.
  const upcoming = sortedToday.filter(a => ACTIVE.has(a.status) && toMinutes(a.endTime) > nowMin)
  const shownToday = (upcoming.length ? upcoming : sortedToday).slice(0, 6)
  const hiddenToday = sortedToday.length - shownToday.length

  return (
    <div className="space-y-6">
      <PageHeader title="Início" subtitle={capFirst(format(today, "EEEE, d 'de' MMMM", { locale: ptBR }))}
        actions={<>
          <Link to="/admin/agenda" className={btnClass('secondary', 'md', 'desktop-only')}><CalendarDays size={16} /> Agenda</Link>
          <button type="button" className={btnClass('primary')} onClick={() => navigate('/admin/agenda?novo=1')}>
            <Plus size={16} /> <span className="lbl-long">Novo agendamento</span><span className="lbl-short">Novo</span>
          </button>
        </>} />

      {/* Resultado do mês */}
      <section aria-labelledby="mes">
        <h2 id="mes" className="text-md font-semibold mb-3">Resultado de {monthName}</h2>
        {isLoading || !data ? <LedgerSkeleton /> : (
          <Ledger items={[
            { label: 'Faturamento', value: brl(data.totalRevenue), delta: { pct: pctChange(data.totalRevenue, prevData?.totalRevenue) } },
            { label: 'Despesas', value: brl(data.totalExpense), delta: { pct: pctChange(data.totalExpense, prevData?.totalExpense), goodWhenUp: false } },
            { label: 'Lucro', value: brl(data.netProfit), tone: data.netProfit < 0 ? 'bad' : undefined, delta: { pct: pctChange(data.netProfit, prevData?.netProfit) } },
            { label: 'Ticket médio', value: brl(data.averageTicket), delta: { pct: pctChange(data.averageTicket, prevData?.averageTicket) } },
          ]} />
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
        {/* Hoje */}
        <Panel title={upcoming.length ? 'Próximos horários de hoje' : 'Hoje'} split pad={false}
          description={todayAppts?.length ? `${todayAppts.length} ${todayAppts.length === 1 ? 'agendamento' : 'agendamentos'} no dia, ${doneToday} ${doneToday === 1 ? 'concluído' : 'concluídos'}` : undefined}
          actions={<Link to="/admin/agenda" className={btnClass('ghost', 'sm')}>Abrir agenda</Link>}>
          {loadingToday ? <ListSkeleton rows={3} boxed={false} /> : !sortedToday.length ? (
            <EmptyState icon={CalendarX2} title="Nenhum horário marcado para hoje"
              hint="Quando um cliente agendar pelo link ou você marcar pela agenda, ele aparece aqui."
              action={<button type="button" className={btnClass('secondary', 'sm')} onClick={() => navigate('/admin/agenda?novo=1')}><Plus size={14} /> Marcar horário</button>} />
          ) : (
            <>
              <ul className="ds-list">
                {shownToday.map(a => <TodayRow key={a.id} a={a} next={a.id === nextId} />)}
              </ul>
              {hiddenToday > 0 && (
                <Link to="/admin/agenda" className="flex items-center justify-center h-11 border-t border-line text-13 font-medium text-ink-2 hover:text-ink hover:bg-surface-2 rounded-b-panel">
                  Ver os {sortedToday.length} horários do dia na agenda
                </Link>
              )}
            </>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Link de agendamento" description="Envie para os clientes marcarem sozinhos, pelo celular.">
            <PublicLinkButtons />
          </Panel>

          <Panel title={`Agenda de ${monthName}`}>
            {isLoading || !data ? <BlockSkeleton height={132} /> : (
              <dl className="ds-dl">
                <div><dt>Agendamentos</dt><dd className="t-num">{num(data.totalAppointments)}</dd></div>
                <div><dt>Concluídos</dt><dd className="t-num">{num(data.completedCount)}</dd></div>
                <div><dt>Cancelamentos</dt><dd className="t-num">{num(data.cancelledCount)} <span className="text-ink-3 font-normal">({data.cancellationRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span></dd></div>
                <div><dt>Clientes atendidos</dt><dd className="t-num">{num(data.uniqueClients)}</dd></div>
              </dl>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Receita e despesas" description="Últimos 6 meses"
          actions={hasMonthly ? <Legend items={[['Receita', CHART_MAIN], ['Despesas', CHART_SECOND]]} /> : undefined}>
          {!monthly ? <BlockSkeleton height={220} /> : !hasMonthly ? (
            <EmptyState title="Sem lançamentos nos últimos meses" hint="A receita entra sozinha quando um atendimento é concluído. Despesas você lança no Financeiro." />
          ) : (
            <ResponsiveContainer width="100%" height={232}>
              <BarChart data={monthlyData} barGap={3} barCategoryGap="28%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={72} tickFormatter={v => brlCompact(v)} />
                <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{
                  revenue: { label: 'Receita', color: CHART_MAIN, fmt: brl },
                  expense: { label: 'Despesas', color: CHART_SECOND, fmt: brl },
                }} />} />
                <Bar dataKey="revenue" fill={CHART_MAIN} radius={[3, 3, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expense" fill={CHART_SECOND} radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Agendamentos por dia" description="Últimos 7 dias">
          {loadingPerf ? <BlockSkeleton height={220} /> : !hasWeek ? (
            <EmptyState title="Nenhum agendamento nos últimos 7 dias" hint="Os atendimentos de cada dia aparecem aqui." />
          ) : (
            <ResponsiveContainer width="100%" height={232}>
              <BarChart data={week} barCategoryGap="30%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip cursor={chartBarCursor} content={<ChartTooltip
                  labelFmt={(l) => week.find(w => w.label === l)?.full ?? String(l)}
                  series={{ count: { label: 'Agendamentos', color: CHART_MAIN, fmt: num } }} />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {barFills(week, row => (row as { isToday: boolean }).isToday)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
      <Panel title="Desempenho por barbeiro" description="Últimos 7 dias, sem cancelados" split pad={false}>
        {loadingPerf ? <ListSkeleton rows={3} boxed={false} /> : !barberPerf?.length ? (
          <EmptyState icon={Scissors} title="Nenhum barbeiro cadastrado"
            hint="Cadastre a equipe para acompanhar atendimentos, receita e ocupação de cada um."
            action={<Link to="/admin/barbeiros" className={btnClass('secondary', 'sm')}>Cadastrar barbeiro</Link>} />
        ) : desktop ? (
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Barbeiro</th>
                  <th className="ds-right">Atendimentos</th>
                  <th className="ds-right">Receita</th>
                  <th style={{ width: '22%' }}>Ocupação</th>
                  <th style={{ width: 128 }}>Semana</th>
                </tr>
              </thead>
              <tbody>
                {barberPerf.map(b => (
                  <tr key={b.id} className="ds-row-link" onClick={() => navigate(`/admin/barbeiros/${b.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={b.name} src={b.photoUrl} size={32} />
                        <span className="font-medium">{b.name}</span>
                        {!b.isActive && <Pill tone="neutral">Inativo</Pill>}
                      </div>
                    </td>
                    <td className="ds-num">{num(b.totalAppointments)}</td>
                    <td className="ds-num font-medium">{brl(b.revenue)}</td>
                    <td><Occupancy pct={b.occupancyRate} /></td>
                    <td><WeekBars b={b} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul className="ds-list">
            {barberPerf.map(b => (
              <li key={b.id}>
                <Link to={`/admin/barbeiros/${b.id}`} className="ds-row">
                  <Avatar name={b.name} src={b.photoUrl} size={36} />
                  <div className="ds-row-main">
                    <p className="ds-row-title">{b.name}</p>
                    <p className="ds-row-sub">{num(b.totalAppointments)} atendimentos, {b.occupancyRate.toFixed(0)}% ocupado</p>
                  </div>
                  <span className="t-num font-semibold">{brl(b.revenue)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Serviços mais vendidos" description={`Em ${monthName}, por receita`} split={!!data?.topServices.length} pad={false}>
        {!data ? <ListSkeleton rows={3} boxed={false} /> : !data.topServices.length ? (
          <EmptyState title="Nenhum serviço vendido este mês" hint="O ranking aparece conforme os atendimentos são concluídos." />
        ) : (
          <ol className="ds-list">
            {data.topServices.map((s, i) => (
              <li key={s.name + i} className="ds-row">
                <span className="w-6 text-ink-3 t-num font-semibold text-sm">{i + 1}</span>
                <div className="ds-row-main">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="ds-row-title">{s.name}</p>
                    <span className="t-num font-semibold whitespace-nowrap">{brl(s.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="ds-progress flex-1">
                      <span style={{ width: `${Math.max(2, Math.min(100, (s.revenue / (data.topServices[0]?.revenue || 1)) * 100))}%` }} />
                    </div>
                    <span className="text-xs text-ink-3 t-num w-[68px] text-right">{num(s.count)} {s.count === 1 ? 'venda' : 'vendas'}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      </div>
    </div>
  )
}

function TodayRow({ a, next }: { a: Appointment; next: boolean }) {
  const muted = a.status === 'Cancelled' || a.status === 'NoShow'
  return (
    <li className="ds-row relative" style={next ? { background: 'var(--accent-soft)' } : undefined}>
      {next && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--accent)' }} aria-hidden />}
      <div className="w-[52px] flex-shrink-0">
        <p className={`t-num font-semibold text-md leading-5 ${muted ? 'text-ink-3 line-through' : ''}`}>{hhmm(a.startTime)}</p>
        <p className="t-num text-xs text-ink-3">{hhmm(a.endTime)}</p>
      </div>
      <div className="ds-row-main">
        <p className="ds-row-title">{a.clientName || 'Cliente'}</p>
        <p className="ds-row-sub">{a.serviceName} com {a.barberName}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {next ? <Pill tone="accent">Próximo</Pill> : <StatusMark status={a.status} />}
        <span className="t-num text-13 text-ink-2">{brl(a.finalPrice)}</span>
      </div>
    </li>
  )
}

function Occupancy({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, pct))
  return (
    <div className="flex items-center gap-3">
      <div className="ds-progress flex-1"><span style={{ width: `${v}%` }} /></div>
      <span className="t-num text-13 text-ink-2 w-10 text-right">{v.toFixed(0)}%</span>
    </div>
  )
}

const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

/* Mini barras seg→dom: quantos atendimentos o barbeiro teve em cada dia. */
function WeekBars({ b }: { b: BarberPerformance }) {
  const max = Math.max(1, ...b.weeklyAppointments)
  return (
    <div className="flex items-end gap-1 h-8" aria-label={`Atendimentos por dia: ${b.weeklyAppointments.join(', ')}`}>
      {DAY_LETTERS.map((l, i) => {
        const v = b.weeklyAppointments[i] ?? 0
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`${v}`}>
            <span className="w-full rounded-[2px]" style={{ height: Math.max(2, (v / max) * 22), background: v ? 'var(--chart-1)' : 'var(--line)' }} />
            <span className="text-[9px] leading-none text-ink-3">{l}</span>
          </div>
        )
      })}
    </div>
  )
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex items-center gap-4">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />{label}
        </span>
      ))}
    </div>
  )
}
