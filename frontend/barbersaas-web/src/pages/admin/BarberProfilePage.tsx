import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, Pencil, UserRound, FileDown, CalendarDays, Clock } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, BarChart, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { chartAxisTick, chartGridStroke, chartBarCursor, CHART_MAIN, CHART_SECOND } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'
import { useBarber, useBarberServices, useBarberSchedule, useBarberPerformanceSeries, useGoogleStatus, useConnectGoogle, useDisconnectGoogle } from '../../features/barbers/barbersApi'
import { useBarberPerformance } from '../../features/dashboard/dashboardApi'
import { useSettings } from '../../features/settings/settingsApi'
import { generateBarberReport } from '../../lib/pdf/barberReport'
import { captureNode } from '../../lib/pdf/reportKit'
import { EditBarberModal } from '../../components/admin/EditBarberModal'
import { ScheduleModal } from '../../components/admin/ScheduleModal'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Ledger } from '../../components/ui/Ledger'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { LedgerSkeleton, BlockSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { formatPhoneBR } from '../../lib/masks'
import { brl, brlCompact, num, hhmm } from '../../lib/format'
import { payModel } from '../../lib/barber'
import { effectiveHero } from '../../lib/theme-tenant'

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
// dayOfWeek do .NET: 0 = domingo … 6 = sábado. Exibimos de segunda a domingo.
const dayNames: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' }
const dayOrder = [1, 2, 3, 4, 5, 6, 0]

export default function BarberProfilePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  // Mês INTEIRO (mesma janela do Início) — senão concluídos com data futura somem daqui.
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')
  const monthName = format(today, 'MMMM', { locale: ptBR })

  const { data: barber, isLoading, isError } = useBarber(id)
  const { data: services, isLoading: loadingServices } = useBarberServices(id)
  const { data: schedule, isLoading: loadingSchedule } = useBarberSchedule(id)
  const { data: google } = useGoogleStatus(id)
  const connectGoogle = useConnectGoogle(id)
  const disconnectGoogle = useDisconnectGoogle(id)

  // Volta do consentimento do Google: o backend redireciona com ?google=connected|error.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const result = searchParams.get('google')
    if (!result) return
    if (result === 'connected') toast.success('Google Agenda conectado.')
    else toast.error('Não foi possível conectar o Google Agenda. Tente de novo.')
    searchParams.delete('google')
    setSearchParams(searchParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: series, isLoading: loadingSeries } = useBarberPerformanceSeries(id, 6)
  const { data: perfList } = useBarberPerformance(monthStart, monthEnd)
  const { data: settings } = useSettings()
  const perf = perfList?.find(p => p.id.toLowerCase() === id.toLowerCase())

  // Gráfico oculto em fundo branco, capturado em 2x para o PDF.
  const pdfChartRef = useRef<HTMLDivElement>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const back = <Link to="/admin/barbeiros" className="ds-back"><ChevronLeft size={16} /> Barbeiros</Link>

  if (isLoading) {
    return (
      <div className="space-y-6">
        {back}
        <div className="flex items-center gap-4"><Skeleton className="w-16 h-16 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-72" /></div></div>
        <LedgerSkeleton />
        <BlockSkeleton height={280} />
      </div>
    )
  }

  if (isError || !barber) {
    return (
      <div className="space-y-6">
        {back}
        <EmptyState boxed icon={UserRound} title="Barbeiro não encontrado"
          hint="Ele pode ter sido removido ou o link está incorreto."
          action={<Button variant="secondary" onClick={() => navigate('/admin/barbeiros')}>Ver barbeiros</Button>} />
      </div>
    )
  }

  const offered = (services ?? []).filter(s => s.isOffered)
  const seriesData = series?.map(p => ({ ...p, label: format(new Date(`${p.month}-01T12:00:00`), 'MMM', { locale: ptBR }) }))
  const hasSeries = seriesData?.some(p => p.revenue > 0 || p.appointments > 0) ?? false
  const weekly = perf?.weeklyAppointments ?? []
  const weeklyData = weekdayLabels.map((label, idx) => ({ label, count: weekly[idx] ?? 0 }))
  const hasWeekly = weekly.some(c => c > 0)
  const ticket = perf && perf.totalAppointments > 0 ? perf.revenue / perf.totalAppointments : 0
  const brandHex = effectiveHero(settings?.primaryColor, settings?.secondaryColor)

  const handleDownloadPdf = async () => {
    if (!settings) { toast.error('Aguarde os dados carregarem.'); return }
    setPdfBusy(true)
    try {
      const chart = hasSeries && pdfChartRef.current ? await captureNode(pdfChartRef.current) : null
      await generateBarberReport({ settings, periodStart: monthStart, barber, perf, services: services ?? [], chart })
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={back}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={barber.name} src={barber.photoUrl} size={56} />
            <span className="min-w-0">
              <span className="block truncate">{barber.name}</span>
              <span className="flex items-center gap-2 mt-1.5 flex-wrap font-sans">
                {!barber.isActive && <Pill tone="neutral">Inativo</Pill>}
                {barber.showInPublicPage ? <Pill tone="ok">Na página de agendamento</Pill> : <Pill tone="neutral">Oculto da página</Pill>}
              </span>
            </span>
          </span>
        }
        actions={<>
          <Button variant="secondary" onClick={handleDownloadPdf} loading={pdfBusy} disabled={!settings}>
            <FileDown size={16} /> <span className="lbl-long">Relatório do mês</span><span className="lbl-short">PDF</span>
          </Button>
          <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={16} /> <span className="lbl-long">Editar</span></Button>
        </>} />

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm -mt-2">
        <div className="flex gap-2"><dt className="text-ink-2">Telefone</dt><dd className="font-medium t-num">{barber.phone ? formatPhoneBR(barber.phone) : 'Não informado'}</dd></div>
        <div className="flex gap-2"><dt className="text-ink-2">Remuneração</dt><dd className="font-medium">{payModel(barber)}</dd></div>
        {barber.bio && <div className="flex gap-2 basis-full"><dt className="sr-only">Apresentação</dt><dd className="text-ink-2 max-w-[70ch]">{barber.bio}</dd></div>}
      </dl>

      <section aria-labelledby="mes-barbeiro">
        <h2 id="mes-barbeiro" className="text-md font-semibold mb-3">Resultado de {monthName}</h2>
        {!perfList ? <LedgerSkeleton /> : (
          <Ledger items={[
            { label: 'Faturamento', value: brl(perf?.revenue ?? 0) },
            { label: 'Atendimentos', value: num(perf?.totalAppointments ?? 0) },
            { label: 'Ocupação da agenda', value: `${(perf?.occupancyRate ?? 0).toFixed(0)}%` },
            { label: 'Ticket médio', value: brl(ticket) },
          ]} />
        )}
      </section>

      <Panel title="Desempenho" description="Últimos 6 meses, atendimentos concluídos"
        actions={hasSeries ? (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-ink-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_MAIN }} />Faturamento</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-2"><span className="w-3 h-[2px]" style={{ background: 'var(--ink-2)' }} />Atendimentos</span>
          </div>
        ) : undefined}>
        {loadingSeries ? <BlockSkeleton height={260} /> : !hasSeries ? (
          <EmptyState title="Sem atendimentos concluídos ainda" hint="Faturamento e atendimentos deste barbeiro aparecem aqui mês a mês." />
        ) : (
          <ResponsiveContainer width="100%" height={270}>
            <ComposedChart data={seriesData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="32%">
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={chartAxisTick} axisLine={false} tickLine={false} width={72} tickFormatter={(v: number) => brlCompact(v)} />
              <YAxis yAxisId="appt" orientation="right" tick={chartAxisTick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
              <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{
                revenue: { label: 'Faturamento', color: CHART_MAIN, fmt: brl },
                appointments: { label: 'Atendimentos', color: 'var(--ink-2)', fmt: num },
              }} />} />
              <Bar yAxisId="rev" dataKey="revenue" fill={CHART_MAIN} radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Line yAxisId="appt" type="monotone" dataKey="appointments" stroke="var(--ink-2)" strokeWidth={2} dot={{ r: 3, fill: 'var(--ink-2)', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Panel title="Serviços e preços" split={offered.length > 0} pad={false}
          actions={<Link to="/admin/servicos" className="ds-btn ds-btn-ghost ds-btn-sm">Gerenciar</Link>}>
          {loadingServices ? <div className="p-5 space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-9" />)}</div>
            : offered.length === 0 ? (
              <EmptyState title="Nenhum serviço vinculado" hint="Vincule serviços a este barbeiro para ele aparecer nas reservas." />
            ) : (
              <ul className="ds-list">
                {offered.map(s => {
                  const custom = s.customPrice != null && s.customPrice !== s.basePrice
                  return (
                    <li key={s.serviceId} className="ds-row">
                      <span className="flex-1 min-w-0 truncate">{s.serviceName}</span>
                      {custom && <span className="text-13 text-ink-3 line-through t-num">{brl(s.basePrice)}</span>}
                      <span className="font-semibold t-num">{brl(s.effectivePrice)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
        </Panel>

        <Panel title="Horário de trabalho" split pad={false}
          actions={<Button variant="ghost" size="sm" onClick={() => setEditingSchedule(true)}><Clock size={15} /> Editar horários</Button>}>
          {loadingSchedule ? <div className="p-5 space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8" />)}</div>
            : !schedule?.shifts?.length ? (
              <EmptyState title="Sem horários definidos" hint="Defina os turnos para a agenda saber quando ele atende."
                action={<Button variant="secondary" size="sm" onClick={() => setEditingSchedule(true)}>Definir horários</Button>} />
            ) : (
              <ul className="ds-list">
                {dayOrder.map(day => {
                  const shifts = schedule.shifts.filter(s => s.dayOfWeek === day && s.isActive)
                  return (
                    <li key={day} className="ds-row">
                      <span className="flex-1 text-ink-2">{dayNames[day]}</span>
                      {shifts.length === 0
                        ? <span className="text-13 text-ink-3">Folga</span>
                        : <span className="font-medium t-num text-right">{shifts.map(s => `${hhmm(s.startTime)}–${hhmm(s.endTime)}`).join(', ')}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
        </Panel>
      </div>

      <Panel title="Google Agenda"
        description={google?.connected
          ? <>Cada agendamento vira um evento no calendário{google.email ? <> de <span className="text-ink font-medium">{google.email}</span></> : ' da conta conectada'}.</>
          : 'Conecte a conta Google do barbeiro para cada agendamento virar um evento no calendário dele.'}
        actions={google?.connected ? (
          <Button variant="secondary" onClick={() => setConfirmDisconnect(true)}>Desconectar</Button>
        ) : (
          <Button variant="secondary" loading={connectGoogle.isPending}
            onClick={() => connectGoogle.mutate(undefined, { onError: () => toast.error('Não foi possível iniciar a conexão com o Google.') })}>
            <CalendarDays size={16} /> Conectar
          </Button>
        )}>
        <div className="flex items-center gap-2 text-13">
          {google?.connected ? <Pill tone="ok">Conectado</Pill> : <Pill tone="neutral">Não conectado</Pill>}
        </div>
      </Panel>

      <Panel title="Atendimentos por dia da semana" description={`Em ${monthName}`}>
        {!hasWeekly ? (
          <EmptyState title="Nenhum atendimento no mês" hint="A distribuição por dia da semana aparece conforme a agenda anda." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barCategoryGap="30%" margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{ count: { label: 'Atendimentos', color: CHART_MAIN, fmt: num } }} />} />
              <Bar dataKey="count" fill={CHART_SECOND} radius={[3, 3, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Gráfico oculto (fonte da imagem do PDF — não aparece na tela) */}
      {seriesData && (
        <div ref={pdfChartRef} aria-hidden
          style={{ position: 'absolute', left: -10000, top: 0, width: 760, height: 300, background: '#ffffff', padding: 12 }}>
          <ComposedChart width={736} height={276} data={seriesData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e6e6ea" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#555555', fontSize: 12 }} axisLine={{ stroke: '#cccccc' }} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => brl(v)} />
            <YAxis yAxisId="appt" orientation="right" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Bar yAxisId="rev" dataKey="revenue" fill={brandHex} radius={[4, 4, 0, 0]} maxBarSize={46} isAnimationActive={false} />
            <Line yAxisId="appt" type="monotone" dataKey="appointments" stroke="#888888" strokeWidth={2} dot={{ r: 3, fill: '#888888' }} isAnimationActive={false} />
          </ComposedChart>
        </div>
      )}

      {editing && <EditBarberModal barber={barber} onClose={() => setEditing(false)} />}
      {editingSchedule && <ScheduleModal barber={barber} onClose={() => setEditingSchedule(false)} />}

      <Modal isOpen={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} title="Desconectar o Google Agenda?"
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmDisconnect(false)}>Voltar</Button>
          <Button variant="danger" loading={disconnectGoogle.isPending}
            onClick={() => disconnectGoogle.mutate(undefined, {
              onSuccess: () => { toast.success('Google Agenda desconectado.'); setConfirmDisconnect(false) },
              onError: () => toast.error('Não foi possível desconectar. Tente de novo.'),
            })}>
            Desconectar
          </Button>
        </>}>
        <p className="text-sm text-ink-2">Os próximos agendamentos de {barber.name} deixam de virar eventos no calendário. Os eventos já criados continuam lá.</p>
      </Modal>
    </div>
  )
}
