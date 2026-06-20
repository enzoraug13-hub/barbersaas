import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Percent } from 'lucide-react'
import { useDashboard } from '../../features/dashboard/dashboardApi'
import { CardGridSkeleton } from '../../components/ui/Skeleton'
import { Card } from '../../components/ui/Card'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (n: number) => n.toLocaleString('pt-BR')

function KPICard({ title, value, sub, icon: Icon, chip, i = 0 }: { title: string; value: string; sub?: string; icon: any; chip: string; i?: number }) {
  return (
    <Card className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 45}ms` }}>
      <div className={`ds-icon-chip ds-icon-chip-${chip}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>{title}</p>
        <p className="ds-text-primary" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginTop: 2 }}>{value}</p>
        {sub && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>{sub}</p>}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const today = new Date()
  const start = format(startOfMonth(today), 'yyyy-MM-dd')
  const end   = format(endOfMonth(today), 'yyyy-MM-dd')
  const { data, isLoading } = useDashboard(start, end)

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="ds-page-title">Dashboard</h2>
        <p className="ds-page-sub">
          {format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard i={0} title="Faturamento"  value={fmt(data.totalRevenue)}  icon={TrendingUp}   chip="success" />
        <KPICard i={1} title="Despesas"     value={fmt(data.totalExpense)}   icon={TrendingDown} chip="error" />
        <KPICard i={2} title="Lucro"        value={fmt(data.netProfit)}      icon={DollarSign}   chip="accent" />
        <KPICard i={3} title="Ticket Médio" value={fmt(data.averageTicket)}  icon={Percent}      chip="info" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard i={4} title="Agendamentos"     value={fmtN(data.totalAppointments)} icon={Calendar} chip="accent" sub={`${data.completedCount} concluídos`} />
        <KPICard i={5} title="Cancelamentos"    value={fmtN(data.cancelledCount)}    icon={Calendar} chip="error"    sub={`${data.cancellationRate.toFixed(1)}% de taxa`} />
        <KPICard i={6} title="Clientes Únicos"  value={fmtN(data.uniqueClients)}     icon={Users}    chip="info" />
      </div>

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
