import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, User, Phone, Scissors, Clock, TrendingUp, Calendar, Percent, DollarSign, FileDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { chartAxisTick, chartGridStroke, chartBarCursor, accentBarGradient, barCells } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'
import { useBarber, useBarberServices, useBarberSchedule, useBarberPerformanceSeries } from '../../features/barbers/barbersApi'
import { useBarberPerformance } from '../../features/dashboard/dashboardApi'
import { useSettings } from '../../features/settings/settingsApi'
import { generateBarberReport } from '../../lib/pdf/barberReport'
import { captureNode } from '../../lib/pdf/reportKit'
import { EditBarberModal } from '../../components/admin/EditBarberModal'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { CardGridSkeleton } from '../../components/ui/Skeleton'
import { formatPhoneBR } from '../../lib/masks'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (n: number) => n.toLocaleString('pt-BR')

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

// dayOfWeek do .NET: 0=Domingo .. 6=Sábado. Exibimos Seg→Dom.
const dayNames: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' }
const dayOrder = [1, 2, 3, 4, 5, 6, 0]
const hhmm = (t: string) => (t ?? '').slice(0, 5)

const kpiColors: Record<string, string> = {
  success: 'var(--color-success)', error: 'var(--color-error)',
  warning: 'var(--color-warning)', info: 'var(--color-info)', accent: 'var(--accent)',
}

function KPICard({ title, value, sub, icon: Icon, chip }: {
  title: string; value: string; sub?: string; icon: LucideIcon; chip: string
}) {
  const color = kpiColors[chip] ?? 'var(--accent)'
  return (
    <Card style={{ borderBottom: `2px solid ${color}` }}>
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center flex-shrink-0" style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `color-mix(in srgb, ${color} 15%, transparent)`, color,
        }}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ds-text-secondary" style={{ fontSize: '12px' }}>{title}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1 }}>{value}</p>
          {sub && <p className="ds-text-disabled mt-1" style={{ fontSize: 'var(--text-xs)' }}>{sub}</p>}
        </div>
      </div>
    </Card>
  )
}

export default function BarberProfilePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')

  const { data: barber, isLoading, isError } = useBarber(id)
  const { data: services, isLoading: loadingServices } = useBarberServices(id)
  const { data: schedule, isLoading: loadingSchedule } = useBarberSchedule(id)
  const { data: series, isLoading: loadingSeries } = useBarberPerformanceSeries(id, 6)
  const { data: perfList } = useBarberPerformance(monthStart, todayStr)
  const { data: settings } = useSettings()
  const perf = perfList?.find(p => p.id.toLowerCase() === id.toLowerCase())

  // Gráfico oculto em tema CLARO, capturado em 2x para o PDF (o da tela é escuro).
  const pdfChartRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/barbeiros')}><ArrowLeft size={16} /> Voltar</Button>
        <CardGridSkeleton cells={4} />
        <CardGridSkeleton cells={2} />
      </div>
    )
  }

  if (isError || !barber) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/barbeiros')}><ArrowLeft size={16} /> Voltar</Button>
        <EmptyState icon={User} title="Barbeiro não encontrado"
          hint="Ele pode ter sido removido ou o link está incorreto."
          action={<Button onClick={() => navigate('/admin/barbeiros')}>Ver barbeiros</Button>} />
      </div>
    )
  }

  const commissionLabel = barber.commissionType === 1 ? fmt(barber.commissionValue) : `${barber.commissionValue}%`
  const offered = (services ?? []).filter(s => s.isOffered)
  const seriesData = series?.map(p => ({ ...p, label: format(new Date(`${p.month}-01`), 'MMM', { locale: ptBR }) }))
  const hasSeries = seriesData?.some(p => p.revenue > 0 || p.appointments > 0) ?? false
  const weekly = perf?.weeklyAppointments ?? []
  const weeklyData = weekdayLabels.map((label, idx) => ({ label, count: weekly[idx] ?? 0 }))
  const hasWeekly = weekly.some(c => c > 0)
  const ticket = perf && perf.totalAppointments > 0 ? perf.revenue / perf.totalAppointments : 0
  const brandHex = settings?.primaryColor || '#1a1a1a'

  const handleDownloadPdf = async () => {
    if (!settings) { toast.error('Aguarde os dados carregarem.'); return }
    setPdfBusy(true)
    try {
      const chart = hasSeries && pdfChartRef.current ? await captureNode(pdfChartRef.current) : null
      await generateBarberReport({
        settings, periodStart: monthStart, barber, perf, services: services ?? [], chart,
      })
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/barbeiros')}><ArrowLeft size={16} /> Voltar</Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleDownloadPdf} loading={pdfBusy} disabled={!settings}>
            <FileDown size={16} /> Baixar relatório do barbeiro (PDF)
          </Button>
          <Button onClick={() => setEditing(true)}><Pencil size={16} /> Editar</Button>
        </div>
      </div>

      {/* Cabeçalho */}
      <Card style={{ padding: 'var(--space-6)' }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {barber.photoUrl ? (
            <img src={barber.photoUrl} alt={barber.name} className="rounded-full object-cover flex-shrink-0"
              style={{ width: 112, height: 112, border: '3px solid var(--accent)' }} />
          ) : (
            <div className="ds-icon-chip ds-icon-chip-accent flex-shrink-0"
              style={{ width: 112, height: 112, borderRadius: '50%', fontSize: 40 }}>
              <User size={48} />
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', color: 'var(--text-primary)' }}>{barber.name}</h2>
              <Badge variant={barber.isActive ? 'success' : 'default'}>{barber.isActive ? 'Ativo' : 'Inativo'}</Badge>
              {barber.showInPublicPage && <Badge variant="info">Visível ao público</Badge>}
            </div>
            {barber.bio && <p className="ds-text-secondary mt-2" style={{ fontSize: 'var(--text-sm)', maxWidth: 560 }}>{barber.bio}</p>}
            <div className="flex items-center justify-center sm:justify-start gap-5 mt-3 flex-wrap">
              {barber.phone && (
                <span className="flex items-center gap-1.5 ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                  <Phone size={14} /> {formatPhoneBR(barber.phone)}
                </span>
              )}
              <span className="flex items-center gap-1.5 ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                <Percent size={14} /> Comissão: <span className="ds-text-primary font-semibold">{commissionLabel}</span>
                <span className="ds-text-disabled">({barber.commissionType === 1 ? 'fixo' : 'percentual'})</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs do mês */}
      <div>
        <p className="ds-text-disabled mb-2" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {format(today, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KPICard title="Faturamento" value={fmt(perf?.revenue ?? 0)} icon={TrendingUp} chip="success" />
          <KPICard title="Atendimentos" value={fmtN(perf?.totalAppointments ?? 0)} icon={Calendar} chip="accent" />
          <KPICard title="Ocupação" value={`${(perf?.occupancyRate ?? 0).toFixed(0)}%`} icon={Percent} chip="info" />
          <KPICard title="Ticket médio" value={fmt(ticket)} icon={DollarSign} chip="warning" />
        </div>
      </div>

      {/* Gráfico de desempenho (6 meses) */}
      <Card>
        <h3 className="ds-section-title mb-4">Desempenho — últimos 6 meses</h3>
        {loadingSeries ? (
          <div style={{ height: 280 }} className="ds-shimmer" />
        ) : !hasSeries ? (
          <EmptyState icon={TrendingUp} title="Sem dados de desempenho"
            hint="Faturamento e atendimentos concluídos deste barbeiro aparecem aqui." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={seriesData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
              <defs>{accentBarGradient('barberRevFill')}</defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
              <YAxis yAxisId="rev" tick={chartAxisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmt(v)} />
              <YAxis yAxisId="appt" orientation="right" tick={chartAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{
                revenue: { label: 'Faturamento', color: 'var(--accent)', fmt },
                appointments: { label: 'Atendimentos', color: 'var(--color-info)', fmt: fmtN },
              }} />} />
              <Legend formatter={(value: string) => value === 'revenue' ? 'Faturamento' : 'Atendimentos'}
                wrapperStyle={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }} />
              <Bar yAxisId="rev" dataKey="revenue" name="revenue" fill="url(#barberRevFill)" radius={[5, 5, 0, 0]} maxBarSize={46}>
                {barCells(seriesData ?? [], 'revenue')}
              </Bar>
              <Line yAxisId="appt" type="monotone" dataKey="appointments" name="appointments" stroke="var(--color-info)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-info)' }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Serviços & preços */}
        <Card>
          <h3 className="ds-section-title mb-4 flex items-center gap-2"><Scissors size={16} /> Serviços & preços</h3>
          {loadingServices ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="ds-shimmer" style={{ height: 44 }} />)}</div>
          ) : offered.length === 0 ? (
            <EmptyState icon={Scissors} title="Nenhum serviço vinculado"
              hint="Vincule serviços a este barbeiro para que ele apareça nas reservas." />
          ) : (
            <div className="space-y-2">
              {offered.map(s => {
                const custom = s.customPrice != null && s.customPrice !== s.basePrice
                return (
                  <div key={s.serviceId} className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="ds-text-primary" style={{ fontSize: 'var(--text-sm)' }}>{s.serviceName}</span>
                    <span className="flex items-center gap-2">
                      {custom && <span className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)', textDecoration: 'line-through' }}>{fmt(s.basePrice)}</span>}
                      <span className="ds-text-accent font-semibold" style={{ fontSize: 'var(--text-sm)' }}>{fmt(s.effectivePrice)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Horário de trabalho */}
        <Card>
          <h3 className="ds-section-title mb-4 flex items-center gap-2"><Clock size={16} /> Horário de trabalho</h3>
          {loadingSchedule ? (
            <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="ds-shimmer" style={{ height: 32 }} />)}</div>
          ) : !schedule?.shifts?.length ? (
            <EmptyState icon={Clock} title="Sem horários definidos"
              hint="Configure os turnos pela lista de barbeiros." />
          ) : (
            <div className="space-y-1.5">
              {dayOrder.map(day => {
                const shifts = schedule.shifts.filter(s => s.dayOfWeek === day && s.isActive)
                return (
                  <div key={day} className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{dayNames[day]}</span>
                    {shifts.length === 0 ? (
                      <span className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic' }}>Folga</span>
                    ) : (
                      <span className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)' }}>
                        {shifts.map(s => `${hhmm(s.startTime)}–${hhmm(s.endTime)}`).join('  ·  ')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Distribuição por dia da semana (mês) */}
      <Card>
        <h3 className="ds-section-title mb-4">Atendimentos por dia da semana — {format(today, 'MMMM', { locale: ptBR })}</h3>
        {!hasWeekly ? (
          <EmptyState icon={Calendar} title="Nenhum atendimento no período"
            hint="A distribuição dos atendimentos do mês por dia da semana aparece aqui." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barCategoryGap="22%">
              <defs>{accentBarGradient('barberWeekly')}</defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip cursor={chartBarCursor}
                content={<ChartTooltip series={{ count: { label: 'Atendimentos', color: 'var(--accent)', fmt: fmtN } }} />} />
              <Bar dataKey="count" fill="url(#barberWeekly)" radius={[5, 5, 0, 0]} maxBarSize={48}>
                {barCells(weeklyData, 'count')}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Gráfico oculto em tema claro — fonte da imagem 2x do PDF (não aparece na tela) */}
      {seriesData && (
        <div ref={pdfChartRef} aria-hidden
          style={{ position: 'absolute', left: -10000, top: 0, width: 760, height: 300, background: '#ffffff', padding: 12 }}>
          <ComposedChart width={736} height={276} data={seriesData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6e6ea" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#555555', fontSize: 12 }} axisLine={{ stroke: '#cccccc' }} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => fmt(v)} />
            <YAxis yAxisId="appt" orientation="right" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Bar yAxisId="rev" dataKey="revenue" fill={brandHex} radius={[4, 4, 0, 0]} maxBarSize={46} isAnimationActive={false} />
            <Line yAxisId="appt" type="monotone" dataKey="appointments" stroke="#888888" strokeWidth={2} dot={{ r: 3, fill: '#888888' }} isAnimationActive={false} />
          </ComposedChart>
        </div>
      )}

      {editing && <EditBarberModal barber={barber} onClose={() => setEditing(false)} />}
    </div>
  )
}
