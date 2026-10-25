import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { useCreateInvoice, useMarkInvoicePaid, type Invoice } from '../../features/superadmin/invoicesApi'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { Pill } from '../ui/Badge'
import { NumberField } from '../ui/NumberField'
import { InvoiceReceiptButton } from './InvoiceReceiptButton'
import { brl } from '../../lib/format'
import { apiErrorMessage } from '../../lib/apiError'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const competenceOf = (i: Invoice) => `${MONTHS[i.competenceMonth - 1]?.slice(0, 3)}/${i.competenceYear}`
const todayYmd = () => format(new Date(), 'yyyy-MM-dd')

function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  if (invoice.status === 'Paid') return <Pill tone="ok">Paga</Pill>
  return invoice.dueDate.slice(0, 10) < todayYmd() ? <Pill tone="bad">Vencida</Pill> : <Pill tone="warn">Em aberto</Pill>
}

/* Lista de faturas (tabela no desktop, linhas no celular) com baixa e comprovante. */
export function InvoiceList({ invoices, showTenant, desktop }: { invoices: Invoice[]; showTenant?: boolean; desktop: boolean }) {
  const markPaid = useMarkInvoicePaid()

  const togglePaid = async (i: Invoice) => {
    const paid = i.status !== 'Paid'
    try {
      await markPaid.mutateAsync({ id: i.id, paid })
      toast.success(paid ? 'Fatura marcada como paga.' : 'Fatura reaberta.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível alterar a fatura.'))
    }
  }
  const busy = (i: Invoice) => markPaid.isPending && markPaid.variables?.id === i.id

  const payButton = (i: Invoice) => i.status === 'Paid'
    ? <Button variant="ghost" size="sm" onClick={() => togglePaid(i)} loading={busy(i)}>Reabrir</Button>
    : <Button variant="secondary" size="sm" onClick={() => togglePaid(i)} loading={busy(i)}>Marcar paga</Button>

  if (desktop) {
    return (
      <div className="ds-table-scroll">
        <table className="ds-table">
          <thead>
            <tr>
              {showTenant && <th>Barbearia</th>}
              <th>Competência</th>
              <th className="ds-right">Valor</th>
              <th>Vencimento</th>
              <th>Situação</th>
              <th className="ds-right"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id}>
                {showTenant && <td><Link to={`/super-admin/contas/${i.tenantId}`} className="font-medium hover:underline">{i.tenantName}</Link></td>}
                <td className="t-num">{competenceOf(i)}</td>
                <td className="ds-num font-medium">{brl(i.amount)}</td>
                <td className="t-num ds-muted whitespace-nowrap">
                  {format(parseISO(i.dueDate), 'dd/MM/yyyy')}
                  {i.status === 'Paid' && i.paidAt && <span className="block text-xs text-ink-3">paga em {format(parseISO(i.paidAt), 'dd/MM')}</span>}
                </td>
                <td><InvoiceStatus invoice={i} /></td>
                <td className="ds-right">
                  <div className="flex items-center justify-end gap-1">
                    <InvoiceReceiptButton invoice={i} />
                    {payButton(i)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <ul className="ds-list">
      {invoices.map(i => (
        <li key={i.id} className="px-4 py-3.5 border-b border-line last:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{showTenant ? i.tenantName : competenceOf(i)}</p>
              <p className="text-13 text-ink-2 t-num">
                {showTenant ? `${competenceOf(i)}, ` : ''}vence {format(parseISO(i.dueDate), 'dd/MM')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="t-num font-semibold">{brl(i.amount)}</p>
              <div className="mt-1"><InvoiceStatus invoice={i} /></div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1 mt-2">
            <InvoiceReceiptButton invoice={i} />
            {payButton(i)}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* Emitir fatura. Com `tenant` fixo (página da barbearia) não mostra o seletor.
   Montar só quando aberto: o formulário começa limpo a cada vez. */
export function NewInvoiceModal({ tenant, tenants, suggestAmount, onClose }: {
  tenant?: { id: string; name: string }
  tenants?: { id: string; name: string }[]
  /** Valor sugerido (ex.: o da última fatura da barbearia). */
  suggestAmount?: (tenantId: string) => number | undefined
  onClose: () => void
}) {
  const create = useCreateInvoice()
  const now = new Date()
  const [form, setForm] = useState(() => ({
    tenantId: tenant?.id ?? '',
    competenceYear: now.getFullYear(),
    competenceMonth: now.getMonth() + 1,
    amount: (tenant && suggestAmount?.(tenant.id)) || 0,
    dueDate: format(new Date(now.getFullYear(), now.getMonth(), 10), 'yyyy-MM-dd'),
    notes: '',
  }))
  const [errors, setErrors] = useState<{ tenant?: string; amount?: string }>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.tenantId) next.tenant = 'Escolha a barbearia.'
    if (form.amount <= 0) next.amount = 'Informe um valor maior que zero.'
    setErrors(next)
    if (next.tenant || next.amount) return
    try {
      await create.mutateAsync({
        tenantId: form.tenantId,
        competenceYear: form.competenceYear,
        competenceMonth: form.competenceMonth,
        amount: form.amount,
        dueDate: form.dueDate,
        notes: form.notes.trim() || undefined,
      })
      toast.success('Fatura emitida.')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível emitir a fatura.'))
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nova fatura" subtitle={tenant?.name}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="new-invoice" loading={create.isPending}>Emitir fatura</Button>
      </>}>
      <form id="new-invoice" onSubmit={submit} className="space-y-4">
        {!tenant && (
          <Select label="Barbearia" value={form.tenantId} error={errors.tenant}
            onChange={e => {
              const id = e.target.value
              setForm(f => ({ ...f, tenantId: id, amount: f.amount || suggestAmount?.(id) || 0 }))
              setErrors(er => ({ ...er, tenant: undefined }))
            }}>
            <option value="">Escolha a barbearia</option>
            {[...(tenants ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        )}

        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Select label="Mês de referência" value={form.competenceMonth}
            onChange={e => setForm(f => ({ ...f, competenceMonth: Number(e.target.value) }))}>
            {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </Select>
          <Field label="Ano" htmlFor="invoice-year">
            <NumberField id="invoice-year" value={form.competenceYear} min={2020} max={2100}
              onChange={v => setForm(f => ({ ...f, competenceYear: v }))} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" htmlFor="invoice-amount" error={errors.amount}>
            <div className="ds-affix">
              <span className="ds-affix-pre">R$</span>
              <NumberField id="invoice-amount" step="0.01" min={0} placeholder="0,00" value={form.amount}
                onChange={v => { setForm(f => ({ ...f, amount: v })); if (errors.amount) setErrors(er => ({ ...er, amount: undefined })) }} />
            </div>
          </Field>
          <Input label="Vencimento" type="date" value={form.dueDate} required
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </div>

        <Input label="Observação" optional value={form.notes} maxLength={500}
          placeholder="Ex.: plano mensal, desconto do primeiro mês"
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </form>
    </Modal>
  )
}
