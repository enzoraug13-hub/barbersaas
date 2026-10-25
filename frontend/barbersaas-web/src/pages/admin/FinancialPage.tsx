import { useState } from 'react'
import { Plus, FileDown, ReceiptText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Select, Field } from '../../components/ui/Input'
import { Segmented } from '../../components/ui/Controls'
import { Pill } from '../../components/ui/Badge'
import { Ledger } from '../../components/ui/Ledger'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, LedgerSkeleton } from '../../components/ui/Skeleton'
import type { FinancialTransaction } from '../../types'
import { useDashboard, useBarberPerformance, usePaymentMethods } from '../../features/dashboard/dashboardApi'
import { useBarbers } from '../../features/barbers/barbersApi'
import { useSettings } from '../../features/settings/settingsApi'
import { generateMonthlyReport } from '../../lib/pdf/monthlyReport'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl } from '../../lib/format'
import { apiErrorMessage } from '../../lib/apiError'

const categories = ['Serviço', 'Produto', 'Aluguel', 'Energia', 'Salário', 'Comissão', 'Marketing', 'Equipamento', 'Manutenção', 'Outro']
const categoryOf = (c: string) => categories[+c] ?? c
const statusLabel: Record<string, { label: string; tone: 'ok' | 'info' | 'warn' }> = {
  Paid: { label: 'Pago', tone: 'ok' }, Partial: { label: 'Parcial', tone: 'info' }, Pending: { label: 'A pagar', tone: 'warn' },
}
const fmtDay = (d: string) => { try { return format(parseISO(d), "d 'de' MMM", { locale: ptBR }) } catch { return d } }

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export default function FinancialPage() {
  const desktop = useIsDesktop()
  const today  = new Date()
  const thisMonth = { start: ymd(startOfMonth(today)), end: ymd(endOfMonth(today)) }
  const lastMonth = { start: ymd(startOfMonth(subMonths(today, 1))), end: ymd(endOfMonth(subMonths(today, 1))) }
  const [start, setStart] = useState(thisMonth.start)
  const [end,   setEnd]   = useState(thisMonth.end)
  const [showForm, setShowForm] = useState(false)
  // Receita de atendimento entra sozinha: o lançamento manual mais comum é despesa.
  const emptyForm = () => ({ type: 1, category: 9, description: '', amount: '', dueDate: ymd(new Date()), notes: '' })
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const preset = start === thisMonth.start && end === thisMonth.end ? 'this'
    : start === lastMonth.start && end === lastMonth.end ? 'last' : 'custom'
  const setPreset = (p: 'this' | 'last' | 'custom') => {
    if (p === 'this') { setStart(thisMonth.start); setEnd(thisMonth.end) }
    if (p === 'last') { setStart(lastMonth.start); setEnd(lastMonth.end) }
  }

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['financial', start, end],
    queryFn: async () => (await api.get('/financial', { params: { start, end } })).data.data as FinancialTransaction[],
  })

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', start, end],
    queryFn: async () => (await api.get('/financial/summary', { params: { start, end } })).data.data as { revenue: number; expense: number; netProfit: number },
  })

  // Dados do relatório PDF (respeitam o período escolhido)
  const { data: settings }    = useSettings()
  const { data: dashboard }   = useDashboard(start, end)
  const { data: barberPerf }  = useBarberPerformance(start, end)
  const { data: barberList }  = useBarbers()
  const { data: payments }    = usePaymentMethods(start, end)
  const [pdfBusy, setPdfBusy] = useState(false)

  const handleDownloadPdf = async () => {
    if (!settings || !dashboard) { toast.error('Aguarde os dados carregarem.'); return }
    setPdfBusy(true)
    try {
      await generateMonthlyReport({ settings, periodStart: start, dashboard, barbers: barberPerf ?? [], barberMeta: barberList ?? [], payments })
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  const create = useMutation({
    mutationFn: async () => { await api.post('/financial', { ...form, type: +form.type, category: +form.category, amount: +form.amount, dueDate: form.dueDate }) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      // O Início lê as mesmas transações por outras chaves — sem invalidar, os números ficariam velhos.
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['dashboard-monthly'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-barber'] })
      qc.invalidateQueries({ queryKey: ['dashboard-payment-methods'] })
      toast.success(+form.type === 0 ? 'Receita lançada.' : 'Despesa lançada.')
      setShowForm(false)
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível salvar o lançamento.')),
  })

  const isRevenue = (t: FinancialTransaction) => t.type === 'Revenue'
  const sorted = [...(transactions ?? [])].sort((a, b) => (b.transactionDate ?? b.dueDate).localeCompare(a.transactionDate ?? a.dueDate))

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro"
        subtitle="Receitas dos atendimentos entram sozinhas. Despesas e outras receitas, você lança aqui."
        actions={<>
          <Button variant="secondary" onClick={handleDownloadPdf} loading={pdfBusy} disabled={!settings || !dashboard} className="desktop-only">
            <FileDown size={16} /> Relatório PDF
          </Button>
          <Button onClick={() => { setForm(emptyForm()); setShowForm(true) }}><Plus size={16} /> <span className="lbl-long">Novo lançamento</span><span className="lbl-short">Lançar</span></Button>
        </>} />

      <div className="flex items-end gap-3 flex-wrap">
        <Segmented value={preset} onChange={setPreset} ariaLabel="Período"
          options={[{ value: 'this', label: 'Este mês' }, { value: 'last', label: 'Mês passado' }, { value: 'custom', label: 'Personalizado' }]} />
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="ds-input w-auto" value={start} onChange={e => setStart(e.target.value)} aria-label="De" />
            <span className="text-13 text-ink-3">até</span>
            <input type="date" className="ds-input w-auto" value={end} onChange={e => setEnd(e.target.value)} aria-label="Até" />
          </div>
        )}
      </div>

      {!summary ? <LedgerSkeleton cells={3} /> : (
        <Ledger items={[
          { label: 'Receitas', value: brl(summary.revenue) },
          { label: 'Despesas', value: brl(summary.expense) },
          { label: 'Resultado', value: brl(summary.netProfit), tone: summary.netProfit < 0 ? 'bad' : undefined },
        ]} />
      )}

      {isLoading ? <ListSkeleton rows={5} /> : !sorted.length ? (
        <EmptyState boxed icon={ReceiptText} title="Nenhum lançamento no período"
          hint="Atendimentos concluídos geram receita aqui. Aluguel, luz e compras você lança como despesa."
          action={<Button variant="secondary" onClick={() => { setForm(emptyForm()); setShowForm(true) }}><Plus size={16} /> Novo lançamento</Button>} />
      ) : desktop ? (
        <Panel pad={false}>
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Situação</th>
                  <th className="ds-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => {
                  const st = statusLabel[t.status] ?? statusLabel.Pending
                  return (
                    <tr key={t.id}>
                      <td className="ds-muted t-num whitespace-nowrap">{fmtDay(t.transactionDate ?? t.dueDate)}</td>
                      <td className="font-medium">{t.description}</td>
                      <td className="ds-muted">{categoryOf(t.category)}</td>
                      <td><Pill tone={st.tone}>{st.label}</Pill></td>
                      <td className="ds-num font-semibold" style={{ color: isRevenue(t) ? 'var(--ok)' : 'var(--ink)' }}>
                        {isRevenue(t) ? '+' : '−'} {brl(t.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <ul className="ds-list">
            {sorted.map(t => {
              const st = statusLabel[t.status] ?? statusLabel.Pending
              return (
                <li key={t.id} className="ds-row">
                  <div className="ds-row-main">
                    <p className="ds-row-title">{t.description}</p>
                    <p className="ds-row-sub">{categoryOf(t.category)}, {fmtDay(t.transactionDate ?? t.dueDate)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-semibold t-num" style={{ color: isRevenue(t) ? 'var(--ok)' : 'var(--ink)' }}>{isRevenue(t) ? '+' : '−'} {brl(t.amount)}</span>
                    {t.status !== 'Paid' && <Pill tone={st.tone}>{st.label}</Pill>}
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo lançamento"
        footer={<>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="tx-form" loading={create.isPending}>{+form.type === 0 ? 'Lançar receita' : 'Lançar despesa'}</Button>
        </>}>
        <form id="tx-form" onSubmit={e => { e.preventDefault(); create.mutate() }} className="space-y-4">
          <Field label="Tipo">
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 1, label: 'Despesa', desc: 'Aluguel, contas, compras' }, { v: 0, label: 'Receita', desc: 'Vendas e outras entradas' }].map(o => (
                <button key={o.v} type="button" className="ds-choice" aria-pressed={+form.type === o.v}
                  onClick={() => setForm(f => ({ ...f, type: o.v }))}>
                  <span className="text-sm font-semibold">{o.label}</span>
                  <span className="text-xs text-ink-2">{o.desc}</span>
                </button>
              ))}
            </div>
          </Field>
          <Input label="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
            placeholder={+form.type === 1 ? 'Ex.: Conta de luz de outubro' : 'Ex.: Venda de pomadas'} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$)" type="number" step="0.01" min="0.01" inputMode="decimal" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0,00" />
            <Input label="Data" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required />
          </div>
          <Select label="Categoria" value={form.category} onChange={e => setForm(f => ({ ...f, category: +e.target.value }))}>
            {categories.map((c, i) => <option key={i} value={i}>{c}</option>)}
          </Select>
        </form>
      </Modal>
    </div>
  )
}
