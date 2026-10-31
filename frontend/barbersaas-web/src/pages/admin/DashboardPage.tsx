import { useState } from 'react'
import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Percent, Scissors, CalendarX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { useDashboard, useMonthlyRevenue, useBarberPerformance } from '../../features/dashboard/dashboardApi'
import type { BarberPerformance } from '../../features/dashboard/dashboardApi'
import { useAppointments } from '../../features/appointments/appointmentsApi'
import { useAuthStore } from '../../store/authStore'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, min as minDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { assetUrl } from '../../lib/api'
import { CountUp, Stagger, StaggerItem } from '../../components/motion'
import {
  GlassCard, Badge, Trend, Progress, Donut, EmptyState, ListSkeleton, Skeleton, GlassTooltip, PeriodPill,
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

/* ---------------- Peças ---------------- */

function BarberPerformanceCard({ b }: { b: BarberPerformance }) {
  const chartData = weekdayLabels.map((label, idx) => ({ label, count: b.weeklyAppointments[idx] ?? 0 }))
  return (
    <GlassCard className="h-full">
      <div className="flex items-center gap-3 mb-5">
        {b.photoUrl
          ? <img src={assetUrl(b.photoUrl)} alt={b.name} className="g-avatar w-11 h-11" />
          : <div className="g-avatar w-11 h-11 text-base">{b.name[0]?.toUpperCase()}</div>}
        <div className="flex-1 min-w-0">
          <p className="g-fg-1 font-semibold truncate text-[15px]">{b.name}</p>
        </div>
        <Badge tone={b.isActive ? 'success' : 'neutral'} dot>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      <ResponsiveContainer width="100%" height={96}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>{gBarGradient(`chairBars-${b.id}`)}</defs>
          <XAxis dataKey="label" tick={{ ...gAxisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={gBarCursor} content={<GlassTooltip series={{ count: { label: 'Agendamentos', color: 'var(--accent)', fmt: fmtN } }} />} />
          <Bar dataKey="count" fill={`url(#chairBars-${b.id})`} radius={[6, 6, 2, 2]} maxBarSize={22}
            isAnimationActive={false} shape={growMiniBars}>
            {gBarCells(chartData, 'count')}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t g-divider">
        <div>
          <p className="g-eyebrow text-[12px]">Agend.</p>
          <CountUp value={b.totalAppointments} format={fmtInt} className="g-fg-1 font-bold text-lg block mt-0.5" />
        </div>
        <div>
          <p className="g-eyebrow text-[12px]">Receita</p>
          <CountUp value={b.revenue} className="g-accent font-bold text-lg block mt-0.5" />
        </div>
        <div>
          <p className="g-eyebrow text-[12px]">Ocupação</p>
          <CountUp value={b.occupancyRate} format={n => `${n.toFixed(0)}%`} className="g-fg-1 font-bold text-lg block mt-0.5" />
        </div>
      </div>
    </GlassCard>
  )
}

/** KPI compacto (coluna ao lado do hero). */
function KPICard({ title, value, icon: Icon, trend }: { title: string; value: number; icon: LucideIcon; trend?: number }) {
  return (
    <GlassCard className="h-full flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="g-eyebrow">{title}</p>
        <span className="g-icon-chip g-icon-chip--sm"><Icon size={16} strokeWidth={1.75} /></span>
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <CountUp value={value} className="g-stat g-stat--sm block" />
        {trend !== undefined && <Trend value={trend} />}
      </div>
    </GlassCard>
  )
}

function greetingFor(d: Date) {
  const h = d.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 lg:space-y-10" role="status" aria-label="Carregando">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
        <GlassCard hover={false} className="xl:col-span-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-11 w-64 mt-4" />
          <Skeleton className="h-5 w-20 mt-4" />
          <Skeleton className="h-40 w-full mt-6" style={{ borderRadius: 14 }} />
        </GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-5 lg:gap-6">
          {[0, 1, 2].map(i => (
            <GlassCard key={i} hover={false}>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-40 mt-5" />
            </GlassCard>
          ))}
        </div>
      </div>
      <GlassCard hover={false}>
        <div className="grid grid-cols-3 gap-6">
          {[0, 1, 2].map(i => <div key={i}><Skeleton className="h-3.5 w-24" /><Skeleton className="h-9 w-16 mt-4" /></div>)}
        </div>
      </GlassCard>
    </div>
  )
}

/* ---------------- Página ---------------- */

export default function DashboardPage() {
  const reduce = useReducedMotion()
  const user = useAuthStore(s => s.user)
  const today = new Date()
  // Seletor de período: mês exibido (0 = mês atual, o padrão — igual a antes).
  const [monthOffset, setMonthOffset] = useState(0)
  const [direction, setDirection] = useState(0)
  const ref = subMonths(today, monthOffset)
  const periodStart = startOfMonth(ref)
  const periodEnd = endOfMonth(ref)
  const start = format(periodStart, 'yyyy-MM-dd')
  const end   = format(periodEnd, 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')
  const { data, isLoading } = useDashboard(start, end)
  const prevMonth = subMonths(ref, 1)
  const { data: prevData } = useDashboard(format(startOfMonth(prevMonth), 'yyyy-MM-dd'), format(endOfMonth(prevMonth), 'yyyy-MM-dd'))
  const pctChange = (curr: number, prev: number | undefined) =>
    prev === undefined || prev === 0 ? undefined : ((curr - prev) / prev) * 100
  const { data: todayAppts, isLoading: loadingTodayAppts } = useAppointments(todayStr)
  const { data: monthly } = useMonthlyRevenue(6)
  const monthlyChartData = monthly?.map(m => ({ ...m, label: format(new Date(`${m.month}-01`), 'MMM', { locale: ptBR }) }))
  const last7 = format(new Date(today.getTime() - 6 * 86400000), 'yyyy-MM-dd')
  const { data: barberPerf, isLoading: loadingBarberPerf } = useBarberPerformance(last7, todayStr)
  const monthLabel = format(periodStart, "MMMM 'de' yyyy", { locale: ptBR })

  // delta > 0 = voltar meses; o rótulo da pílula desliza no sentido da navegação.
  const go = (delta: number) => { setDirection(delta > 0 ? -1 : 1); setMonthOffset(o => Math.max(0, o + delta)) }

  const firstName = user?.name?.trim().split(/\s+/)[0]
  const header = (
    <div className="flex items-end justify-between gap-5 flex-wrap">
      <div>
        <h2 className="g-page-title">{greetingFor(today)}{firstName ? `, ${firstName}` : ''}</h2>
        <p className="g-page-sub">{format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>
      <PeriodPill label={monthLabel} direction={direction}
        onPrev={() => go(1)} onNext={() => go(-1)} canNext={monthOffset > 0} />
    </div>
  )

  if (isLoading)
    return (
      <div className="space-y-8 lg:space-y-10">
        {header}
        <DashboardSkeleton />
      </div>
    )

  if (!data) return <div className="space-y-8 lg:space-y-10">{header}</div>

  const weekData = data.dailyRevenue.slice(-7)
  const hasWeeklyAppointments = weekData.some(d => d.appointments > 0)
  const hasMonthlyRevenue = monthlyChartData?.some(m => m.revenue > 0 || m.expense > 0) ?? false
  const revenueTrend = pctChange(data.totalRevenue, prevData?.totalRevenue)

  // Faturamento dia a dia no período (dia sem lançamento = 0) para o card hero.
  const revenueByDay = new Map(data.dailyRevenue.map(d => [d.date.slice(0, 10), d.revenue]))
  const heroSeries = eachDayOfInterval({ start: periodStart, end: minDate([periodEnd, today]) })
    .map(d => { const k = format(d, 'yyyy-MM-dd'); return { date: k, revenue: revenueByDay.get(k) ?? 0 } })

  return (
    <div className="space-y-8 lg:space-y-10">
      {header}

      {/* Tudo abaixo remonta ao trocar o período → entradas, contadores e gráficos redisparam. */}
      <div key={start} className="space-y-8 lg:space-y-10">

        {/* Hero de faturamento + KPIs financeiros */}
        <Stagger className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
          <StaggerItem className="xl:col-span-2">
            <GlassCard className="g-card--hero h-full flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="g-eyebrow">Faturamento</p>
                  <CountUp value={data.totalRevenue} className="g-stat g-stat--hero block mt-3" />
                  <div className="flex items-center gap-2 mt-4 min-h-[22px]">
                    {revenueTrend !== undefined && <Trend value={revenueTrend} />}
                  </div>
                </div>
                <span className="g-icon-chip g-icon-chip--accent"><TrendingUp size={18} strokeWidth={1.75} /></span>
              </div>
              <div className="flex-1 min-h-[170px] mt-5 -mx-2 -mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heroSeries} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <defs>{gAreaGradient('heroFill', 'var(--accent)', 0.5)}</defs>
                    <XAxis dataKey="date" hide />
                    <Tooltip cursor={gLineCursor} content={<GlassTooltip
                      labelFmt={d => format(new Date(`${d}T12:00:00`), "dd 'de' MMM", { locale: ptBR })}
                      series={{ revenue: { label: 'Faturamento', color: 'var(--accent)', fmt } }} />} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5}
                      fill="url(#heroFill)" dot={false}
                      activeDot={{ r: 4.5, strokeWidth: 2, stroke: 'rgba(10,8,6,0.9)', fill: 'var(--accent)' }}
                      isAnimationActive={!reduce} {...gChartAnim} animationDuration={1100} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </StaggerItem>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-5 lg:gap-6">
            <StaggerItem><KPICard title="Despesas"     value={data.totalExpense}  icon={TrendingDown} trend={pctChange(data.totalExpense, prevData?.totalExpense)} /></StaggerItem>
            <StaggerItem><KPICard title="Lucro"        value={data.netProfit}     icon={DollarSign}   trend={pctChange(data.netProfit, prevData?.netProfit)} /></StaggerItem>
            <StaggerItem><KPICard title="Ticket Médio" value={data.averageTicket} icon={Percent}      trend={pctChange(data.averageTicket, prevData?.averageTicket)} /></StaggerItem>
          </div>
        </Stagger>

        {/* Operação do período */}
        <Stagger delay={0.2}>
          <StaggerItem>
            <GlassCard padded={false}>
              <div className="g-stat-strip">
                {[
                  { title: 'Agendamentos',    value: data.totalAppointments, icon: Calendar,  sub: `${data.completedCount} concluídos` },
                  { title: 'Cancelamentos',   value: data.cancelledCount,    icon: CalendarX, sub: `${data.cancellationRate.toFixed(1)}% de taxa` },
                  { title: 'Clientes Únicos', value: data.uniqueClients,     icon: Users,     sub: undefined },
                ].map(s => (
                  <div key={s.title} className="px-3 py-4 sm:p-6 lg:p-7 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
                      <span className="g-icon-chip g-icon-chip--sm"><s.icon size={15} strokeWidth={1.75} /></span>
                      {/* No celular a coluna é estreita: o rótulo quebra linha em vez de cortar. */}
                      <p className="g-eyebrow text-[12px] sm:text-[13px] leading-tight sm:truncate">{s.title}</p>
                    </div>
                    <CountUp value={s.value} format={fmtInt} className="g-stat block mt-3 sm:mt-4" />
                    {s.sub && <p className="g-fg-3 text-[11px] sm:text-xs mt-2 leading-tight">{s.sub}</p>}
                  </div>
                ))}
              </div>
            </GlassCard>
          </StaggerItem>
        </Stagger>

        {/* Financeiro: evolução + composição */}
        <Stagger className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6" delay={0.25}>
          <StaggerItem className="xl:col-span-2">
            <GlassCard className="h-full" hover={false}>
              <h3 className="g-section-title mb-6">Receita vs Despesas</h3>
              {!hasMonthlyRevenue ? (
                <EmptyState icon={DollarSign} title="Nenhum dado ainda" hint="A receita e as despesas dos últimos meses aparecem aqui." />
              ) : (
                <ResponsiveContainer width="100%" height={270}>
                  <AreaChart data={monthlyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {gAreaGradient('revenueFill', 'var(--accent)', 0.34)}
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
                      wrapperStyle={{ fontSize: 12, fontFamily: 'var(--g-font)', color: 'var(--g-fg-2)', paddingTop: 10 }} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="var(--accent)" strokeWidth={2.5}
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
              <h3 className="g-section-title mb-6">Resumo Financeiro</h3>
              <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-7">
                <Donut size={164} thickness={16} segments={[
                  { value: Math.max(0, data.netProfit), color: 'var(--accent)' },
                  { value: data.totalExpense, color: DANGER },
                ]}>
                  <span className="g-eyebrow text-[12px]">Lucro</span>
                  <CountUp value={data.netProfit} className="g-fg-1 font-bold text-[15px] mt-0.5" />
                </Donut>
                <div className="w-full flex-1">
                  {[
                    { label: 'Receitas', value: data.totalRevenue, color: 'rgba(255,255,255,0.85)' },
                    { label: 'Despesas', value: data.totalExpense, color: DANGER },
                    { label: 'Lucro',    value: data.netProfit,    color: 'var(--accent)' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-3 border-b g-divider last:border-0">
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
        <Stagger className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-6" delay={0.1}>
          <StaggerItem>
            <GlassCard className="h-full" hover={false}>
              <h3 className="g-section-title mb-6">Agendamentos (últimos 7 dias)</h3>
              {!hasWeeklyAppointments ? (
                <EmptyState icon={Calendar} title="Nenhum dado ainda" hint="Os agendamentos da semana aparecem aqui." />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
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
                    <Bar dataKey="appointments" fill="url(#apptBars)" radius={[8, 8, 3, 3]} maxBarSize={44}
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
              <h3 className="g-section-title mb-6">Serviços Mais Vendidos</h3>
              <div className="space-y-5">
                {data.topServices.length === 0 && (
                  <p className="g-fg-3 text-center py-4 text-sm">Sem dados ainda</p>
                )}
                {data.topServices.map((s, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <span className="g-badge g-badge--accent g-num justify-center flex-shrink-0" style={{ width: 28, height: 28, padding: 0 }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="g-fg-1 font-medium truncate text-sm">{s.name}</span>
                        <CountUp value={s.revenue} className="g-fg-1 font-semibold text-sm flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-3 mt-2.5">
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
          <h3 className="g-section-title mb-6">Agendamentos de hoje</h3>
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
          <h3 className="g-section-title mb-5" style={{ fontSize: 18 }}>Performance por Cadeira</h3>
          {loadingBarberPerf ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {[0, 1, 2].map(i => <GlassCard key={i} hover={false}><ListSkeleton rows={1} /><Skeleton className="h-24 w-full mt-5" /></GlassCard>)}
            </div>
          ) : !barberPerf?.length ? (
            <GlassCard hover={false}>
              <EmptyState icon={Scissors} title="Nenhum barbeiro cadastrado" hint="Cadastre barbeiros para ver a performance por cadeira." />
            </GlassCard>
          ) : (
            <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
              {barberPerf.map(b => <StaggerItem key={b.id}><BarberPerformanceCard b={b} /></StaggerItem>)}
            </Stagger>
          )}
        </section>
      </div>
    </div>
  )
}
