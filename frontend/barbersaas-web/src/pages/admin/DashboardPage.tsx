import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Percent, Scissors, ArrowUp, ArrowDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDashboard, useMonthlyRevenue, useBarberPerformance } from '../../features/dashboard/dashboardApi'
import { useAppointments } from '../../features/appointments/appointmentsApi'
import { CardGridSkeleton, ListSkeleton } from '../../components/ui/Skeleton'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { chartAxisTick, chartGridStroke, chartBarCursor, accentBarGradient, barCells } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (n: number) => n.toLocaleString('pt-BR')

const statusLabel: Record<string, string> = {
  Pending: 'Pendente', Confirmed: 'Confirmado', Completed: 'Concluído', Cancelled: 'Cancelado', NoShow: 'Não compareceu',
}
const statusVariant: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  Pending: 'warning', Confirmed: 'info', Completed: 'success', Cancelled: 'error', NoShow: 'error',
}

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function BarberPerformanceCard({ b, i }: { b: import('../../features/dashboard/dashboardApi').BarberPerformance; i: number }) {
  const chartData = weekdayLabels.map((label, idx) => ({ label, count: b.weeklyAppointments[idx] ?? 0 }))
  return (
    <Card className="animate-slide-up" style={{ animationDelay: `${i * 45}ms` }}>
      <div className="flex items-center gap-3 mb-4">
        {b.photoUrl
          ? <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          : <div className="ds-icon-chip ds-icon-chip-accent font-bold flex-shrink-0" style={{ width: 40, height: 40, borderRadius: '50%' }}>{b.name[0]?.toUpperCase()}</div>}
        <div className="flex-1 min-w-0">
          <p className="ds-text-primary font-semibold truncate" style={{ fontSize: 'var(--text-sm)' }}>{b.name}</p>
        </div>
        <Badge variant={b.isActive ? 'success' : 'default'}>{b.isActive ? 'Ativo' : 'Inativo'}</Badge>
      </div>

      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={chartData}>
          <defs>{accentBarGradient(`chairBars-${b.id}`)}</defs>
          <XAxis dataKey="label" tick={{ ...chartAxisTick, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{ count: { label: 'Agendamentos', color: 'var(--accent)', fmt: fmtN } }} />} />
          <Bar dataKey="count" fill={`url(#chairBars-${b.id})`} radius={[4, 4, 0, 0]} maxBarSize={26}>
            {barCells(chartData, 'count')}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div>
          <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>Agend.</p>
          <p className="ds-text-primary font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{fmtN(b.totalAppointments)}</p>
        </div>
        <div>
          <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>Receita</p>
          <p className="ds-text-accent font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{fmt(b.revenue)}</p>
        </div>
        <div>
          <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>Ocupação</p>
          <p className="ds-text-primary font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{b.occupancyRate.toFixed(0)}%</p>
        </div>
      </div>
    </Card>
  )
}

const kpiColors: Record<string, string> = {
  success: 'var(--color-success)', error: 'var(--color-error)',
  warning: 'var(--color-warning)', info: 'var(--color-info)', accent: 'var(--accent)',
}

function KPICard({ title, value, sub, icon: Icon, chip, trend, i = 0 }: {
  title: string; value: string; sub?: string; icon: LucideIcon; chip: string; trend?: number; i?: number
}) {
  const color = kpiColors[chip] ?? 'var(--accent)'
  return (
    <Card className="animate-slide-up" style={{
      animationDelay: `${i * 45}ms`,
      borderBottom: `2px solid ${color}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center flex-shrink-0" style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color,
        }}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ds-text-secondary" style={{ fontSize: '12px' }}>{title}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1 }}>{value}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {sub && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{sub}</p>}
            {trend !== undefined && (
              <span className="inline-flex items-center gap-0.5 font-medium" style={{ fontSize: '12px', color: trend >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
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

  if (isLoading)
    return (
      <div className="space-y-6">
        <div>
          <h2 className="ds-page-title">Dashboard</h2>
          <p className="ds-page-sub">{format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <CardGridSkeleton cells={4} />
        <CardGridSkeleton cells={3} />
      </div>
    )

  if (!data) return null

  const hasWeeklyAppointments = data.dailyRevenue.slice(-7).some(d => d.appointments > 0)
  const hasMonthlyRevenue = monthlyChartData?.some(m => m.revenue > 0 || m.expense > 0) ?? false

  return (
    <div className="space-y-6">
      <div className="pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', color: 'var(--text-primary)' }}>Dashboard</h2>
        <p className="ds-text-secondary mt-1" style={{ fontSize: '13px' }}>
          {format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard i={0} title="Faturamento"  value={fmt(data.totalRevenue)}  icon={TrendingUp}   chip="success" trend={pctChange(data.totalRevenue, prevData?.totalRevenue)} />
        <KPICard i={1} title="Despesas"     value={fmt(data.totalExpense)}   icon={TrendingDown} chip="error" trend={pctChange(data.totalExpense, prevData?.totalExpense)} />
        <KPICard i={2} title="Lucro"        value={fmt(data.netProfit)}      icon={DollarSign}   chip="accent" trend={pctChange(data.netProfit, prevData?.netProfit)} />
        <KPICard i={3} title="Ticket Médio" value={fmt(data.averageTicket)}  icon={Percent}      chip="info" trend={pctChange(data.averageTicket, prevData?.averageTicket)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard i={4} title="Agendamentos"     value={fmtN(data.totalAppointments)} icon={Calendar} chip="accent" sub={`${data.completedCount} concluídos`} />
        <KPICard i={5} title="Cancelamentos"    value={fmtN(data.cancelledCount)}    icon={Calendar} chip="error"    sub={`${data.cancellationRate.toFixed(1)}% de taxa`} />
        <KPICard i={6} title="Clientes Únicos"  value={fmtN(data.uniqueClients)}     icon={Users}    chip="info" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h3 className="ds-section-title mb-4">Agendamentos (últimos 7 dias)</h3>
          {!hasWeeklyAppointments ? (
            <EmptyState icon={Calendar} title="Nenhum dado ainda" hint="Os agendamentos da semana aparecem aqui." />
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.dailyRevenue.slice(-7)} barCategoryGap="22%">
              <defs>{accentBarGradient('apptBars')}</defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="date" tick={chartAxisTick} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false}
                tickFormatter={d => format(new Date(d), 'dd/MM')} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip cursor={chartBarCursor}
                content={<ChartTooltip
                  labelFmt={d => format(new Date(d), "dd 'de' MMM", { locale: ptBR })}
                  series={{ appointments: { label: 'Agendamentos', color: 'var(--accent)', fmt: fmtN } }} />} />
              <Bar dataKey="appointments" fill="url(#apptBars)" radius={[5, 5, 0, 0]} maxBarSize={46}>
                {barCells(data.dailyRevenue.slice(-7), 'appointments')}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="ds-section-title mb-4">Receita vs Despesas</h3>
          {!hasMonthlyRevenue ? (
            <EmptyState icon={DollarSign} title="Nenhum dado ainda" hint="A receita e as despesas dos últimos meses aparecem aqui." />
          ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyChartData}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-error)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-error)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={48} tickFormatter={v => fmt(v)} />
              <Tooltip content={<ChartTooltip series={{
                revenue: { label: 'Receita', color: 'var(--accent)', fmt },
                expense: { label: 'Despesas', color: 'var(--color-error)', fmt },
              }} />} />
              <Legend
                formatter={(value: string) => value === 'revenue' ? 'Receita' : 'Despesas'}
                wrapperStyle={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revenueFill)" />
              <Area type="monotone" dataKey="expense" name="expense" stroke="var(--color-error)" strokeWidth={2} fill="url(#expenseFill)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Performance por cadeira */}
      <div>
        <h3 className="mb-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
          Performance por Cadeira
        </h3>
        {loadingBarberPerf ? (
          <CardGridSkeleton cells={3} />
        ) : !barberPerf?.length ? (
          <EmptyState icon={Scissors} title="Nenhum barbeiro cadastrado" hint="Cadastre barbeiros para ver a performance por cadeira." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {barberPerf.map((b, i) => <BarberPerformanceCard key={b.id} b={b} i={i} />)}
          </div>
        )}
      </div>

      {/* Próximos agendamentos de hoje */}
      <Card>
        <h3 className="ds-section-title mb-4">Agendamentos de hoje</h3>
        {loadingTodayAppts ? (
          <ListSkeleton rows={3} />
        ) : !todayAppts?.length ? (
          <EmptyState icon={Calendar} title="Nada agendado pra hoje" hint="Os próximos agendamentos do dia aparecem aqui." />
        ) : (
          <div className="space-y-3">
            {todayAppts.map((a, i) => (
              <div key={a.id} style={{ animationDelay: `${i * 50}ms` }} className="flex items-center gap-4 animate-slide-up">
                <div className="text-center w-14 flex-shrink-0">
                  <p className="ds-text-primary font-bold leading-none" style={{ fontSize: 'var(--text-lg)' }}>{a.startTime?.slice(0, 5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="ds-text-primary font-semibold truncate" style={{ fontSize: 'var(--text-sm)' }}>{a.clientName}</p>
                  <p className="ds-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{a.serviceName} · {a.barberName}</p>
                </div>
                <Badge variant={statusVariant[a.status] ?? 'warning'}>{statusLabel[a.status] ?? a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Serviços */}
        <Card>
          <h3 className="ds-section-title mb-4">Serviços Mais Vendidos</h3>
          <div className="space-y-3">
            {data.topServices.length === 0 && (
              <p className="ds-text-disabled text-center py-4" style={{ fontSize: 'var(--text-sm)' }}>Sem dados ainda</p>
            )}
            {data.topServices.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="ds-badge ds-badge-accent" style={{ width: 24, height: 24, borderRadius: 'var(--radius-full)', justifyContent: 'center' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="ds-text-primary font-medium truncate" style={{ fontSize: 'var(--text-sm)' }}>{s.name}</span>
                    <span className="ds-text-accent font-semibold ml-2" style={{ fontSize: 'var(--text-sm)' }}>{fmt(s.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="ds-progress-track">
                      <div className="ds-progress-fill" style={{ width: `${Math.min(100, (s.revenue / (data.topServices[0]?.revenue || 1)) * 100)}%` }} />
                    </div>
                    <span className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{s.count}x</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Resumo Financeiro */}
        <Card>
          <h3 className="ds-section-title mb-4">Resumo Financeiro</h3>
          <div className="space-y-3">
            {[
              { label: 'Receitas', value: data.totalRevenue, color: 'var(--color-success)' },
              { label: 'Despesas', value: data.totalExpense, color: 'var(--color-error)' },
              { label: 'Lucro',    value: data.netProfit,    color: 'var(--tenant-primary)' },
            ].map(row => (
              <div key={row.label} className="ds-divider flex items-center justify-between py-2 last:border-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color }} />
                  <span className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{row.label}</span>
                </div>
                <span className="ds-text-primary font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{fmt(row.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
