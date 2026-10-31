import { useState } from 'react'
import { Plus, Check, Undo2, Receipt } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  useInvoices, useBillingSummary, useCreateInvoice, useMarkInvoicePaid,
  type Invoice, type InvoiceStatus,
} from '../../features/superadmin/invoicesApi'
import { useSuperAdminTenants } from '../../features/superadmin/superAdminApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { NumberField } from '../../components/ui/NumberField'
import { InvoiceReceiptButton } from '../../components/admin/InvoiceReceiptButton'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'
import { TBody, TR } from '../../components/ui/glass/Table'
import { useReducedMotion } from 'framer-motion'
import { CountUp, Stagger, StaggerItem } from '../../components/motion'
import { gAxisTick, gGridStroke, gLineCursor, gAreaGradient, gChartAnim, GlassTooltip, Tabs } from '../../components/ui/glass'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtInt = (n: number) => String(Math.round(n))
const competence = (i: Invoice) => `${String(i.competenceMonth).padStart(2, '0')}/${i.competenceYear}`

const now = new Date()
const emptyForm = () => ({
  tenantId: '',
  competenceYear: now.getFullYear(),
  competenceMonth: now.getMonth() + 1,
  amount: 0,
  dueDate: format(new Date(now.getFullYear(), now.getMonth(), 10), 'yyyy-MM-dd'),
  notes: '',
})

export default function SuperAdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const reduce = useReducedMotion()
  const filters = statusFilter === 'all' ? {} : { status: statusFilter }

  const { data: invoices, isLoading } = useInvoices(filters)
  const { data: summary } = useBillingSummary(6)
  const { data: tenants } = useSuperAdminTenants()
  const create   = useCreateInvoice()
  const markPaid = useMarkInvoicePaid()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tenantId) { toast.error('Escolha a barbearia.'); return }
    if (form.amount <= 0) { toast.error('O valor deve ser maior que zero.'); return }
    try {
      await create.mutateAsync({
        tenantId: form.tenantId,
        competenceYear: form.competenceYear,
        competenceMonth: form.competenceMonth,
        amount: form.amount,
        dueDate: form.dueDate,
        notes: form.notes || undefined,
      })
      toast.success('Fatura criada.')
      setShowCreate(false); setForm(emptyForm())
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao criar a fatura.'))
    }
  }

  const togglePaid = async (i: Invoice) => {
    const paid = i.status !== 'Paid'
    try {
      await markPaid.mutateAsync({ id: i.id, paid })
      toast.success(paid ? 'Fatura marcada como paga.' : 'Fatura reaberta.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao alterar a fatura.'))
    }
  }

  const hasRevenue = (summary?.monthly ?? []).some(m => m.received > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="ds-page-title flex items-center gap-2">
            <Receipt size={24} style={{ color: 'var(--accent)' }} /> Faturas
          </h2>
          <p className="ds-page-sub">O que as barbearias pagam ao Trimly. Recebimento no Pix, baixa manual.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setShowCreate(true) }}><Plus size={16} /> Nova fatura</Button>
      </div>

      {/* Resumo do mês */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem><Card className="h-full">
          <p className="g-eyebrow">Recebido no mês</p>
          <CountUp value={summary?.received ?? 0} format={fmt} className="g-stat g-stat--sm block mt-3" style={{ color: 'var(--color-success)' }} />
        </Card></StaggerItem>
        <StaggerItem><Card className="h-full">
          <p className="g-eyebrow">Em aberto</p>
          <CountUp value={summary?.outstanding ?? 0} format={fmt} className="g-stat g-stat--sm block mt-3" style={{ color: 'var(--color-warning)' }} />
        </Card></StaggerItem>
        <StaggerItem><Card className="h-full">
          <p className="g-eyebrow">Faturas pagas</p>
          <CountUp value={summary?.paidCount ?? 0} format={fmtInt} className="g-stat g-stat--sm block mt-3" style={{ color: 'var(--text-primary)' }} />
        </Card></StaggerItem>
        <StaggerItem><Card className="h-full">
          <p className="g-eyebrow">Faturas em aberto</p>
          <CountUp value={summary?.openCount ?? 0} format={fmtInt} className="g-stat g-stat--sm block mt-3" style={{ color: 'var(--text-primary)' }} />
        </Card></StaggerItem>
      </Stagger>

      {/* Receita ao longo do tempo */}
      <Card>
        <h3 className="ds-section-title mb-4">Recebido por mês</h3>
        {!hasRevenue ? (
          <EmptyState icon={Receipt} title="Nenhuma fatura paga ainda" hint="A receita do Trimly aparece aqui conforme você dá baixa nas faturas." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary?.monthly ?? []}>
              <defs>{gAreaGradient('trimlyRevenueFill', 'var(--accent)', 0.34)}</defs>
              <CartesianGrid stroke={gGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={gAxisTick} axisLine={false} tickLine={false} dy={6} />
              <YAxis tick={gAxisTick} axisLine={false} tickLine={false} width={80} tickFormatter={v => fmt(v)} />
              <Tooltip cursor={gLineCursor} content={<GlassTooltip series={{
                received: { label: 'Recebido', color: 'var(--accent)', fmt },
              }} />} />
              <Area type="monotone" dataKey="received" name="received" stroke="var(--accent)" strokeWidth={2.5} fill="url(#trimlyRevenueFill)"
                dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }} isAnimationActive={!reduce} {...gChartAnim} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filtro + lista */}
      <Tabs value={statusFilter} onChange={setStatusFilter} aria-label="Filtrar faturas"
        items={(['all', 'Open', 'Paid'] as const).map(s => ({ value: s, label: s === 'all' ? 'Todas' : s === 'Open' ? 'Em aberto' : 'Pagas' }))} />

      {isLoading ? (
        <Card><Skeleton className="h-40" /></Card>
      ) : !invoices?.length ? (
        <EmptyState icon={Receipt} title="Nenhuma fatura" hint="Crie a primeira fatura pelo botão acima." />
      ) : (
        <Card className="overflow-x-auto" style={{ padding: 0 }}>
          <table className="w-full" style={{ fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Barbearia</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Competência</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Valor</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Vencimento</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <TBody>
              {invoices.map(i => (
                <TR key={i.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-primary font-medium">{i.tenantName}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-secondary">{competence(i)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-primary font-medium">{fmt(i.amount)}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-secondary">
                    {format(parseISO(i.dueDate), 'dd/MM/yyyy')}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <Badge variant={i.status === 'Paid' ? 'success' : 'warning'}>
                      {i.status === 'Paid' ? 'Paga' : 'Em aberto'}
                    </Badge>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div className="flex items-center gap-1 justify-end flex-wrap">
                      <Button variant="ghost" onClick={() => togglePaid(i)}
                        style={{ fontSize: 'var(--text-xs)', height: 30, color: i.status === 'Paid' ? undefined : 'var(--color-success)' }}>
                        {i.status === 'Paid' ? <><Undo2 size={13} /> Reabrir</> : <><Check size={13} /> Marcar paga</>}
                      </Button>
                      <InvoiceReceiptButton invoice={i} />
                    </div>
                  </td>
                </TR>
              ))}
            </TBody>
          </table>
        </Card>
      )}

      {/* Nova fatura */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova fatura">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="ds-field">
            <label className="ds-label">Barbearia</label>
            <select className="ds-input" value={form.tenantId} required
              onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}>
              <option value="">Escolha…</option>
              {tenants?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="ds-field">
              <label className="ds-label">Mês da competência</label>
              <select className="ds-input" value={form.competenceMonth}
                onChange={e => setForm(f => ({ ...f, competenceMonth: Number(e.target.value) }))}>
                {Array.from({ length: 12 }, (_, m) => (
                  <option key={m + 1} value={m + 1}>{String(m + 1).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <div className="ds-field">
              <label className="ds-label">Ano</label>
              <NumberField value={form.competenceYear} onChange={v => setForm(f => ({ ...f, competenceYear: v }))} />
            </div>
          </div>

          <div className="ds-field">
            <label className="ds-label">Valor (R$)</label>
            <NumberField value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} step="0.01" />
          </div>

          <div className="ds-field">
            <label className="ds-label">Vencimento</label>
            <input type="date" className="ds-input" value={form.dueDate} required
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>

          <Input label="Observações (opcional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} maxLength={500} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" loading={create.isPending}>{create.isPending ? 'Criando…' : 'Criar fatura'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
