import { TrendingUp, TrendingDown, Calendar, Users, DollarSign, Percent } from 'lucide-react'
import { useDashboard } from '../../features/dashboard/dashboardApi'
import { CardGridSkeleton } from '../../components/ui/Skeleton'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (n: number) => n.toLocaleString('pt-BR')

function KPICard({ title, value, sub, icon: Icon, color, i = 0 }: { title: string; value: string; sub?: string; icon: any; color: string; i?: number }) {
  return (
    <div className="card flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 45}ms` }}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-muted text-sm">{title}</p>
        <p className="text-2xl font-bold text-content mt-0.5">{value}</p>
        {sub && <p className="text-xs text-subtle mt-0.5">{sub}</p>}
      </div>
    </div>
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
          <h2 className="text-xl font-bold text-content">Dashboard</h2>
          <p className="text-muted text-sm mt-0.5">{format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <CardGridSkeleton cells={4} />
        <CardGridSkeleton cells={3} />
      </div>
    )

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-content">Dashboard</h2>
        <p className="text-muted text-sm mt-0.5">
          {format(startOfMonth(today), "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard i={0} title="Faturamento"  value={fmt(data.totalRevenue)}  icon={TrendingUp}   color="bg-success/15 text-success" />
        <KPICard i={1} title="Despesas"     value={fmt(data.totalExpense)}   icon={TrendingDown} color="bg-danger/15 text-danger" />
        <KPICard i={2} title="Lucro"        value={fmt(data.netProfit)}      icon={DollarSign}   color="bg-accent/20 text-accent" />
        <KPICard i={3} title="Ticket Médio" value={fmt(data.averageTicket)}  icon={Percent}      color="bg-info/15 text-info" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard i={4} title="Agendamentos"     value={fmtN(data.totalAppointments)} icon={Calendar} color="bg-accent/15 text-accent" sub={`${data.completedCount} concluídos`} />
        <KPICard i={5} title="Cancelamentos"    value={fmtN(data.cancelledCount)}    icon={Calendar} color="bg-danger/15 text-danger"    sub={`${data.cancellationRate.toFixed(1)}% de taxa`} />
        <KPICard i={6} title="Clientes Únicos"  value={fmtN(data.uniqueClients)}     icon={Users}    color="bg-info/15 text-info" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Serviços */}
        <div className="card">
          <h3 className="font-semibold text-content mb-4">Serviços Mais Vendidos</h3>
          <div className="space-y-3">
            {data.topServices.length === 0 && (
              <p className="text-subtle text-sm text-center py-4">Sem dados ainda</p>
            )}
            {data.topServices.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-content font-medium truncate">{s.name}</span>
                    <span className="text-sm text-accent font-semibold ml-2">{fmt(s.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-surfaceHover rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${Math.min(100, (s.revenue / (data.topServices[0]?.revenue || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-subtle">{s.count}x</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="card">
          <h3 className="font-semibold text-content mb-4">Resumo Financeiro</h3>
          <div className="space-y-3">
            {[
              { label: 'Receitas', value: data.totalRevenue, color: 'bg-green-500' },
              { label: 'Despesas', value: data.totalExpense, color: 'bg-red-500' },
              { label: 'Lucro',    value: data.netProfit,    color: 'bg-accent' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                  <span className="text-sm text-muted">{row.label}</span>
                </div>
                <span className="text-sm font-semibold text-content">{fmt(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
