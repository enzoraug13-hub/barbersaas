import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Percent, Scissors, CalendarX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useDashboard, useMonthlyRevenue, useBarberPerformance } from '../../features/dashboard/dashboardApi'
import type { BarberPerformance } from '../../features/dashboard/dashboardApi'
import { useAppointments } from '../../features/appointments/appointmentsApi'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { assetUrl } from '../../lib/api'
import { PublicLinkButtons } from '../../components/admin/PublicLinkButtons'
import { CountUp, Stagger, StaggerItem } from '../../components/motion'
import {
  GlassCard, Badge, Trend, Progress, Donut, EmptyState, KpiSkeleton, ListSkeleton, GlassTooltip,
  gAxisTick, gGridStroke, gBarCursor, gLineCursor, gChartAnim, gBarGradient, gAreaGradient, gBarCells, growBarShape,
} from '../../components/ui/glass'
import type { BadgeTone } from '../../components/ui/glass'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (n: number) => n.toLocaleString('pt-BR')
const fmtInt = (n: number) => fmtN(Math.round(n))

const statusLabel: Record<string, string> = {
  Pending: 'Pendente', Confirmed: 'Confirmado', Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu',
}
const statusTone: Record<string, BadgeTone> = {
  Pending: 'warning', Confirmed: 'info', Completed: 'success', Cancelled: 'danger', NoShow: 'danger',
}

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// Formas de barra que crescem de baixo pra cima com stagger (definidas uma vez).
const growBars = growBarShape(70)
const growMiniBars = growBarShape(45)

// Despesas: semântico danger (suave), separado do accent da série principal.
const DANGER = 'var(--danger)'

function BarberPerformanceCard({ b }: { b: BarberPerformance }) {
  const chartData = weekdayLabels.map((label, idx) => ({ label, count: b.weeklyAppointments[idx] ?? 0 }))
  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-4">
        {b.photoUrl
          ? <img src={assetUrl(b.photoUrl)} alt={b.name} className="g-avatar w-10 h-10" />
          : <div className="g-avatar w-10 h-10 text-sm">{b.name[0]?.toUpperCase()}</div>}
        <div className="flex-1 min-w-0">
          <p className="g-fg-1 font-semibold truncate text-sm">{b.name}</p>
        </div>
        <Badge tone={b.isActive ? 'success' : 'neutral'} dot>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      <ResponsiveContainer width="100%" height={92}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>{gBarGradient(`chairBars-${b.id}`)}</defs>
          <XAxis dataKey="label" tick={{ ...gAxisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={gBarCursor} content={<GlassTooltip series={{ count: { label: 'Agendamentos', color: 'var(--accent)', fmt: fmtN } }} />} />
          <Bar dataKey="count" fill={`url(#chairBars-${b.id})`} radius={[5, 5, 2, 2]} maxBarSize={22}
            isAnimationActive={false} shape={growMiniBars}>
            {gBarCells(chartData, 'count')}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t g-divider">
        <div>
          <p className="g-fg-3 text-[11px]">Agend.</p>
          <CountUp value={b.totalAppointments} format={fmtInt} className="g-fg-1 font-semibold text-sm" />
        </div>
        <div>
          <p className="g-fg-3 text-[11px]">Receita</p>
          <CountUp value={b.revenue} className="g-accent font-semibold text-sm" />
        </div>
        <div>
          <p className="g-fg-3 text-[11px]">Ocupação</p>
          <CountUp value={b.occupancyRate} format={n => `${n.toFixed(0)}%`} className="g-fg-1 font-semibold text-sm" />
        </div>
      </div>
    </GlassCard>
  )
}

function KPICard({ title, value, format: formatValue = fmt, sub, icon: Icon, trend }: {
  title: string; value: number; format?: (n: number) => string; sub?: string; icon: LucideIcon; trend?: number
}) {
  return (
    <GlassCard className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="g-eyebrow pt-1">{title}</p>
        <span className="g-icon-chip"><Icon size={17} /></span>
      </div>
      <CountUp value={value} format={formatValue} className="g-stat mt-3 block truncate" />
      <div className="flex items-center gap-2 mt-3 min-h-[22px] flex-wrap">
        {trend !== undefined && <Trend value={trend} />}
        {sub && <p className="g-fg-3 text-xs">{sub}</p>}
      </div>
    </GlassCard>
  )
}

function PageHeader({ month }: { month: string }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="g-page-title">Dashboard</h2>
        <p className="g-page-sub">{month}</p>
      </div>
      <PublicLinkButtons />
    </div>
  )
}

export default function DashboardPage() {
  const reduce = useReducedMotion()
  const today = new Date()
  const start = format(startOfMonth(today), 'yyyy-MM-dd')
  const end   = format(endOfMonth(today), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')
  const { data, isLoading } = useDashboard(start, end)
  const prevMonth = subMonths(today, 1)
  const { data: prevData } = useDashboard(format(startOfMonth(prevMonth), 'yyyy-MM-dd'), format(endOfMonth(prevMonth), 'yyyy-MM-dd'))
  const pctChange = (curr: number, prev: number | undefined) =>
    prev === undefined || prev === 0 ? undefined : ((curr - prev) / prev) * 100
  const { data: todayAppts, isLoading: loadingTodayAppts } = useAppointments(todayStr)
  const { data: monthly } = useMonthlyRevenue(6)
  const monthlyChartData = monthly?.map(m => ({ ...m, label: format(new Date(`${m.month}-01`), 'MMM', { locale: ptBR }) }))
  const last7 = format(new Date(today.getTime() - 6 * 86400000), 'yyyy-MM-dd')
  const { data: barberPerf, isLoading: loadingBarberPerf } = useBarberPerformance(last7, todayStr)
  const monthLabel = format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })

  if (isLoading)
    return (
      <div className="space-y-6">
        <PageHeader month={monthLabel} />
        <KpiSkeleton cells={4} />
        <KpiSkeleton cells={3} className="grid grid-cols-1 sm:grid-cols-3 gap-4" />
      </div>
    )

  if (!data) return null

  const weekData = data.dailyRevenue.slice(-7)
  const hasWeeklyAppointments = weekData.some(d => d.appointments > 0)
  const hasMonthlyRevenue = monthlyChartData?.some(m => m.revenue > 0 || m.expense > 0) ?? false

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader month={monthLabel} />

      {/* KPIs */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StaggerItem><KPICard title="Faturamento"  value={data.totalRevenue}  icon={TrendingUp}   trend={pctChange(data.totalRevenue, prevData?.totalRevenue)} /></StaggerItem>
        <StaggerItem><KPICard title="Despesas"     value={data.totalExpense}  icon={TrendingDown} trend={pctChange(data.totalExpense, prevData?.totalExpense)} /></StaggerItem>
        <StaggerItem><KPICard title="Lucro"        value={data.netProfit}     icon={DollarSign}   trend={pctChange(data.netProfit, prevData?.netProfit)} /></StaggerItem>
        <StaggerItem><KPICard title="Ticket Médio" value={data.averageTicket} icon={Percent}      trend={pctChange(data.averageTicket, prevData?.averageTicket)} /></StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4" delay={0.15}>
        <StaggerItem><KPICard title="Agendamentos"    value={data.totalAppointments} format={fmtInt} icon={Calendar}  sub={`${data.completedCount} concluídos`} /></StaggerItem>
        <StaggerItem><KPICard title="Cancelamentos"   value={data.cancelledCount}    format={fmtInt} icon={CalendarX} sub={`${data.cancellationRate.toFixed(1)}% de taxa`} /></StaggerItem>
        <StaggerItem><KPICard title="Clientes Únicos" value={data.uniqueClients}     format={fmtInt} icon={Users} /></StaggerItem>
      </Stagger>

      {/* Financeiro: evolução + composição */}
      <Stagger className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6" delay={0.25}>
        <StaggerItem className="xl:col-span-2">
          <GlassCard className="h-full" hover={false}>
            <h3 className="g-section-title mb-5">Receita vs Despesas</h3>
            {!hasMonthlyRevenue ? (
              <EmptyState icon={DollarSign} title="Nenhum dado ainda" hint="A receita e as despesas dos últimos meses aparecem aqui." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {gAreaGradient('revenueFill', 'var(--accent)', 0.32)}
                    {gAreaGradient('expenseFill', DANGER, 0.14)}
                  </defs>
                  <CartesianGrid stroke={gGridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={gAxisTick} axisLine={false} tickLine={false} dy={6} />
                  <YAxis tick={gAxisTick} axisLine={false} tickLine={false} width={80} tickFormatter={v => fmt(v)} />
                  <Tooltip cursor={gLineCursor} content={<GlassTooltip series={{
                    revenue: { label: 'Receita', color: 'var(--accent)', fmt },
                    expense: { label: 'Despesas', color: DANGER, fmt },
                  }} />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(value: string) => value === 'revenue' ? 'Receita' : 'Despesas'}
                    wrapperStyle={{ fontSize: 12, fontFamily: 'var(--g-font)', color: 'var(--g-fg-2)', paddingTop: 8 }} />
                  <Area type="monotone" dataKey="revenue" name="revenue" stroke="var(--accent)" strokeWidth={2.25}
                    fill="url(#revenueFill)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }}
                    isAnimationActive={!reduce} {...gChartAnim} />
                  <Area type="monotone" dataKey="expense" name="expense" stroke={DANGER} strokeWidth={2}
                    fill="url(#expenseFill)" dot={false} activeDot={{ r: 3.5, strokeWidth: 0, fill: DANGER }}
                    isAnimationActive={!reduce} {...gChartAnim} animationBegin={120} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </StaggerItem>

        {/* Resumo Financeiro */}
        <StaggerItem>
          <GlassCard className="h-full" hover={false}>
            <h3 className="g-section-title mb-5">Resumo Financeiro</h3>
            <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-6">
              <Donut segments={[
                { value: Math.max(0, data.netProfit), color: 'var(--accent)' },
                { value: data.totalExpense, color: DANGER },
              ]}>
                <span className="g-fg-3 text-[11px]">Lucro</span>
                <CountUp value={data.netProfit} className="g-fg-1 font-semibold text-sm mt-0.5" />
              </Donut>
              <div className="w-full flex-1">
                {[
                  { label: 'Receitas', value: data.totalRevenue, color: 'rgba(255,255,255,0.85)' },
                  { label: 'Despesas', value: data.totalExpense, color: DANGER },
                  { label: 'Lucro',    value: data.netProfit,    color: 'var(--accent)' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b g-divider last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: row.color }} />
                      <span className="g-fg-2 text-sm">{row.label}</span>
                    </div>
                    <CountUp value={row.value} className="g-fg-1 font-semibold text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </StaggerItem>
      </Stagger>

      {/* Semana + serviços */}
      <Stagger className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6" delay={0.1}>
        <StaggerItem>
          <GlassCard className="h-full" hover={false}>
            <h3 className="g-section-title mb-5">Agendamentos (últimos 7 dias)</h3>
            {!hasWeeklyAppointments ? (
              <EmptyState icon={Calendar} title="Nenhum dado ainda" hint="Os agendamentos da semana aparecem aqui." />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={weekData} barCategoryGap="24%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <defs>{gBarGradient('apptBars')}</defs>
                  <CartesianGrid stroke={gGridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={gAxisTick} axisLine={false} tickLine={false} dy={6}
                    tickFormatter={d => format(new Date(d), 'dd/MM')} />
                  <YAxis tick={gAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip cursor={gBarCursor}
                    content={<GlassTooltip
                      labelFmt={d => format(new Date(d), "dd 'de' MMM", { locale: ptBR })}
                      series={{ appointments: { label: 'Agendamentos', color: 'var(--accent)', fmt: fmtN } }} />} />
                  <Bar dataKey="appointments" fill="url(#apptBars)" radius={[7, 7, 3, 3]} maxBarSize={44}
                    isAnimationActive={false} shape={growBars}>
                    {gBarCells(weekData, 'appointments')}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>
        </StaggerItem>

        {/* Top Serviços */}
        <StaggerItem>
          <GlassCard className="h-full" hover={false}>
            <h3 className="g-section-title mb-5">Serviços Mais Vendidos</h3>
            <div className="space-y-4">
              {data.topServices.length === 0 && (
                <p className="g-fg-3 text-center py-4 text-sm">Sem dados ainda</p>
              )}
              {data.topServices.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="g-badge g-badge--accent g-num justify-center flex-shrink-0" style={{ width: 26, height: 26, padding: 0 }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="g-fg-1 font-medium truncate text-sm">{s.name}</span>
                      <CountUp value={s.revenue} className="g-fg-1 font-semibold text-sm flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Progress value={(s.revenue / (data.topServices[0]?.revenue || 1)) * 100} delay={0.1 + i * 0.08} aria-label={s.name} />
                      <span className="g-fg-3 g-num text-xs w-8 text-right">{s.count}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </StaggerItem>
      </Stagger>

      {/* Próximos agendamentos de hoje */}
      <GlassCard hover={false}>
        <h3 className="g-section-title mb-5">Agendamentos de hoje</h3>
        {loadingTodayAppts ? (
          <ListSkeleton rows={3} />
        ) : !todayAppts?.length ? (
          <EmptyState icon={Calendar} title="Nada agendado pra hoje" hint="Os próximos agendamentos do dia aparecem aqui." />
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {todayAppts.map(a => (
              <StaggerItem key={a.id}>
                <div className="g-appt-tile">
                  <div className="g-appt-time g-num">{a.startTime?.slice(0, 5)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="g-fg-1 font-semibold truncate text-sm">{a.clientName}</p>
                    <p className="g-fg-2 truncate text-xs mt-0.5">{a.serviceName} · {a.barberName}</p>
                  </div>
                  <Badge tone={statusTone[a.status] ?? 'warning'} dot>{statusLabel[a.status] ?? a.status}</Badge>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </GlassCard>

      {/* Performance por cadeira */}
      <section>
        <h3 className="g-section-title mb-4" style={{ fontSize: 17 }}>Performance por Cadeira</h3>
        {loadingBarberPerf ? (
          <KpiSkeleton cells={3} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" />
        ) : !barberPerf?.length ? (
          <GlassCard hover={false}>
            <EmptyState icon={Scissors} title="Nenhum barbeiro cadastrado" hint="Cadastre barbeiros para ver a performance por cadeira." />
          </GlassCard>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {barberPerf.map(b => <StaggerItem key={b.id}><BarberPerformanceCard b={b} /></StaggerItem>)}
          </Stagger>
        )}
      </section>
    </div>
  )
}
