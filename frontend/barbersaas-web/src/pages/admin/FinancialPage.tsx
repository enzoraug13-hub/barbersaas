import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, FileDown } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import type { FinancialTransaction } from '../../types'
import { useDashboard, useBarberPerformance, usePaymentMethods } from '../../features/dashboard/dashboardApi'
import { useBarbers } from '../../features/barbers/barbersApi'
import { useSettings } from '../../features/settings/settingsApi'
import { generateMonthlyReport } from '../../lib/pdf/monthlyReport'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const categories = ['Serviço','Produto','Aluguel','Energia','Salário','Comissão','Marketing','Equipamento','Manutenção','Outro']

export default function FinancialPage() {
  const today  = new Date()
  const [start, setStart] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [end,   setEnd]   = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 0, category: 0, description: '', amount: '', dueDate: format(today, 'yyyy-MM-dd'), notes: '' })
  const qc = useQueryClient()

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['financial', start, end],
    queryFn: async () => {
      const res = await api.get('/financial', { params: { start, end } })
      return res.data.data as FinancialTransaction[]
    }
  })

  const { data: summary } = useQuery({
    queryKey: ['financial-summary', start, end],
    queryFn: async () => {
      const res = await api.get('/financial/summary', { params: { start, end } })
      return res.data.data as { revenue: number; expense: number; netProfit: number }
    }
  })

  // Dados do relatório PDF (respeitam o período selecionado acima)
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
      await generateMonthlyReport({
        settings,
        periodStart: start,
        dashboard,
        barbers: barberPerf ?? [],
        barberMeta: barberList ?? [],
        payments,
      })
    } catch {
      toast.error('Não foi possível gerar o PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/financial', { ...form, amount: +form.amount, dueDate: form.dueDate })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      // O Dashboard lê as mesmas transações por outras chaves — sem invalidar,
      // a despesa criada só aparecia lá depois do staleTime (números "velhos").
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['dashboard-monthly'] })
      qc.invalidateQueries({ queryKey: ['dashboard-by-barber'] })
      qc.invalidateQueries({ queryKey: ['dashboard-payment-methods'] })
      toast.success('Lançamento criado!'); setShowForm(false)
    },
    onError: () => toast.error('Erro ao criar lançamento.')
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="ds-page-title">Financeiro</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" className="ds-input w-auto" value={start} onChange={e => setStart(e.target.value)} />
          <span className="ds-text-disabled">→</span>
          <input type="date" className="ds-input w-auto" value={end} onChange={e => setEnd(e.target.value)} />
          <Button variant="ghost" onClick={handleDownloadPdf} loading={pdfBusy} disabled={!settings || !dashboard}>
            <FileDown size={18} /> Baixar relatório do mês (PDF)
          </Button>
          <Button onClick={() => setShowForm(true)}><Plus size={18} /> Lançamento</Button>
        </div>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Receitas</p><p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>{fmt(summary.revenue)}</p></Card>
          <Card><p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Despesas</p><p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-error)' }}>{fmt(summary.expense)}</p></Card>
          <Card><p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Lucro</p><p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: summary.netProfit >= 0 ? 'var(--accent)' : 'var(--color-error)' }}>{fmt(summary.netProfit)}</p></Card>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <ListSkeleton />
      ) : !transactions?.length ? (
        <EmptyState icon={TrendingUp} title="Nenhuma transação ainda" hint="Lance receitas e despesas para acompanhar o financeiro." />
      ) : (
        <div className="ds-table-wrap">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="hidden sm:table-cell">Categoria</th>
                  <th className="text-right">Valor</th>
                  <th className="text-center hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {t.type === 'Revenue' ? <TrendingUp size={14} style={{ color: 'var(--color-success)' }} className="flex-shrink-0" /> : <TrendingDown size={14} style={{ color: 'var(--color-error)' }} className="flex-shrink-0" />}
                        <span className="ds-text-primary font-medium truncate">{t.description}</span>
                      </div>
                      <span className="ds-text-disabled sm:hidden" style={{ fontSize: 'var(--text-xs)' }}>{categories[+t.category] ?? t.category}</span>
                    </td>
                    <td className="ds-text-secondary hidden sm:table-cell">{categories[+t.category] ?? t.category}</td>
                    <td className="text-right font-semibold" style={{ color: t.type === 'Revenue' ? 'var(--color-success)' : 'var(--color-error)' }}>{fmt(t.amount)}</td>
                    <td className="text-center hidden md:table-cell">
                      <Badge variant={t.status === 'Paid' ? 'success' : t.status === 'Partial' ? 'info' : 'warning'}>
                        {t.status === 'Paid' ? 'Pago' : t.status === 'Partial' ? 'Parcial' : 'Pendente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo Lançamento">
        <form onSubmit={e => { e.preventDefault(); create.mutate() }} className="space-y-4">
          <div className="ds-field">
            <label className="ds-label">Tipo</label>
            <select className="ds-input" value={form.type} onChange={set('type')}>
              <option value={0}>Receita</option>
              <option value={1}>Despesa</option>
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label">Categoria</label>
            <select className="ds-input" value={form.category} onChange={set('category')}>
              {categories.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
          </div>
          <div className="ds-field"><label className="ds-label">Descrição</label><input className="ds-input" value={form.description} onChange={set('description')} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ds-field"><label className="ds-label">Valor (R$)</label><input type="number" step="0.01" className="ds-input" value={form.amount} onChange={set('amount')} required /></div>
            <div className="ds-field"><label className="ds-label">Data</label><input type="date" className="ds-input" value={form.dueDate} onChange={set('dueDate')} required /></div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={create.isPending}>Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
