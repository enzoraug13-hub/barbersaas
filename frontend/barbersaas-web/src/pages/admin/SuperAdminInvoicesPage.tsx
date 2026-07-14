import { useState, useRef } from 'react'
import { Plus, Check, Undo2, Paperclip, ExternalLink, Receipt, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  useInvoices, useBillingSummary, useCreateInvoice, useMarkInvoicePaid, useAttachReceipt,
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
import { uploadImage } from '../../components/ui/ImageField'
import { chartAxisTick, chartGridStroke } from '../../components/ui/chartTheme'
import { ChartTooltip } from '../../components/ui/ChartTooltip'
import { assetUrl } from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

/* ---------- Botão de anexar comprovante (reusa o uploadImage de /uploads) ---------- */
function ReceiptButton({ invoice }: { invoice: Invoice }) {
  const attach = useAttachReceipt()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadImage(file)
      await attach.mutateAsync({ id: invoice.id, receiptUrl: url })
      toast.success('Comprovante anexado.')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao anexar o comprovante.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {invoice.receiptUrl ? (
        <Button variant="ghost" onClick={() => window.open(assetUrl(invoice.receiptUrl!), '_blank', 'noopener')}
          style={{ fontSize: 'var(--text-xs)', height: 30 }}>
          <ExternalLink size={13} /> Comprovante
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}
          style={{ fontSize: 'var(--text-xs)', height: 30 }}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Anexar
        </Button>
      )}
    </>
  )
}

export default function SuperAdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
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
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao criar a fatura.')
    }
  }

  const togglePaid = async (i: Invoice) => {
    const paid = i.status !== 'Paid'
    try {
      await markPaid.mutateAsync({ id: i.id, paid })
      toast.success(paid ? 'Fatura marcada como paga.' : 'Fatura reaberta.')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao alterar a fatura.')
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Recebido no mês</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
            {fmt(summary?.received ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Em aberto</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-warning)' }}>
            {fmt(summary?.outstanding ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Faturas pagas</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.paidCount ?? 0}
          </p>
        </Card>
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Faturas em aberto</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.openCount ?? 0}
          </p>
        </Card>
      </div>

      {/* Receita ao longo do tempo */}
      <Card>
        <h3 className="ds-section-title mb-4">Recebido por mês</h3>
        {!hasRevenue ? (
          <EmptyState icon={Receipt} title="Nenhuma fatura paga ainda" hint="A receita do Trimly aparece aqui conforme você dá baixa nas faturas." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary?.monthly ?? []}>
              <defs>
                <linearGradient id="trimlyRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
              <YAxis tick={chartAxisTick} axisLine={false} tickLine={false} width={64} tickFormatter={v => fmt(v)} />
              <Tooltip content={<ChartTooltip series={{
                received: { label: 'Recebido', color: 'var(--accent)', fmt },
              }} />} />
              <Area type="monotone" dataKey="received" name="received" stroke="var(--accent)" strokeWidth={2} fill="url(#trimlyRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filtro + lista */}
      <div className="flex items-center gap-2">
        {(['all', 'Open', 'Paid'] as const).map(s => (
          <Button key={s} variant={statusFilter === s ? 'primary' : 'ghost'} onClick={() => setStatusFilter(s)}
            style={{ height: 32, fontSize: 'var(--text-xs)' }}>
            {s === 'all' ? 'Todas' : s === 'Open' ? 'Em aberto' : 'Pagas'}
          </Button>
        ))}
      </div>

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
            <tbody>
              {invoices.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                      <ReceiptButton invoice={i} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
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
