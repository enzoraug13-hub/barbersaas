import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useInvoices, useBillingSummary, type InvoiceStatus } from '../../features/superadmin/invoicesApi'
import { useSuperAdminTenants } from '../../features/superadmin/superAdminApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Ledger } from '../../components/ui/Ledger'
import { Segmented } from '../../components/ui/Controls'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, LedgerSkeleton, BlockSkeleton } from '../../components/ui/Skeleton'
import { InvoiceList, NewInvoiceModal } from '../../components/admin/InvoiceUI'
import { chartAxisTick, chartGridStroke, chartBarCursor, barFills, CHART_MAIN } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl, brlCompact, capFirst, num } from '../../lib/format'

export default function SuperAdminInvoicesPage() {
  const desktop = useIsDesktop()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const filters = statusFilter === 'all' ? {} : { status: statusFilter }

  const { data: invoices, isLoading } = useInvoices(filters)
  const { data: summary, isLoading: loadingSummary } = useBillingSummary(6)
  const { data: tenants } = useSuperAdminTenants()
  const [showCreate, setShowCreate] = useState(false)

  const month = capFirst(format(new Date(), 'MMMM', { locale: ptBR }))
  const monthly = (summary?.monthly ?? []).map((m, i, arr) => ({ ...m, label: capFirst(m.label), isLast: i === arr.length - 1 }))
  const sixMonths = monthly.reduce((s, m) => s + m.received, 0)
  const hasRevenue = monthly.some(m => m.received > 0)

  // Sugestão de valor: o da fatura mais recente daquela barbearia na lista carregada.
  const suggestAmount = (tenantId: string) => (invoices ?? [])
    .filter(i => i.tenantId === tenantId)
    .sort((a, b) => (b.competenceYear * 12 + b.competenceMonth) - (a.competenceYear * 12 + a.competenceMonth))[0]?.amount

  return (
    <div className="space-y-5">
      <PageHeader title="Faturas" subtitle="O que as barbearias pagam ao Trimly. Pagamento por Pix, baixa manual."
        actions={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> <span className="lbl-long">Nova fatura</span><span className="lbl-short">Nova</span></Button>} />

      {loadingSummary ? <LedgerSkeleton cells={3} /> : (
        <Ledger items={[
          { label: `Recebido em ${month.toLowerCase()}`, value: brl(summary?.received ?? 0),
            foot: <span>{num(summary?.paidCount ?? 0)} {summary?.paidCount === 1 ? 'fatura paga' : 'faturas pagas'}</span> },
          { label: `A receber em ${month.toLowerCase()}`, value: brl(summary?.outstanding ?? 0),
            foot: <span>{num(summary?.openCount ?? 0)} em aberto</span> },
          { label: 'Recebido em 6 meses', value: brl(sixMonths) },
        ]} />
      )}

      <Panel title="Recebido por mês" description="Pela competência da fatura">
        {loadingSummary ? <BlockSkeleton height={200} /> : !hasRevenue ? (
          <EmptyState icon={Receipt} title="Nenhuma fatura paga ainda" hint="Conforme você dá baixa nas faturas, a receita do Trimly aparece aqui." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} barCategoryGap="32%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={72} tickFormatter={v => brlCompact(v)} />
              <Tooltip cursor={chartBarCursor} content={<ChartTooltip series={{ received: { label: 'Recebido', color: CHART_MAIN, fmt: brl } }} />} />
              <Bar dataKey="received" radius={[3, 3, 0, 0]} maxBarSize={44}>
                {barFills(monthly, row => (row as { isLast: boolean }).isLast)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel pad={false} split title="Todas as faturas"
        actions={<Segmented value={statusFilter} onChange={setStatusFilter} ariaLabel="Filtrar faturas" options={[
          { value: 'all', label: 'Todas' }, { value: 'Open', label: 'Em aberto' }, { value: 'Paid', label: 'Pagas' },
        ]} />}>
        {isLoading ? <ListSkeleton rows={5} boxed={false} /> : !invoices?.length ? (
          <EmptyState icon={Receipt}
            title={statusFilter === 'all' ? 'Nenhuma fatura emitida' : statusFilter === 'Open' ? 'Nenhuma fatura em aberto' : 'Nenhuma fatura paga'}
            hint={statusFilter === 'all' ? 'Emita a primeira pelo botão Nova fatura.' : 'Troque o filtro para ver as outras.'} />
        ) : (
          <InvoiceList invoices={invoices} showTenant desktop={desktop} />
        )}
      </Panel>

      {showCreate && (
        <NewInvoiceModal tenants={tenants?.map(t => ({ id: t.id, name: t.name }))} suggestAmount={suggestAmount}
          onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
