import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import type { FinancialTransaction } from '../../types'

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

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/financial', { ...form, amount: +form.amount, dueDate: form.dueDate })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['financial-summary'] })
      toast.success('Lançamento criado!'); setShowForm(false)
    },
    onError: () => toast.error('Erro ao criar lançamento.')
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-content">Financeiro</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" className="input w-auto" value={start} onChange={e => setStart(e.target.value)} />
          <span className="text-subtle">→</span>
          <input type="date" className="input w-auto" value={end} onChange={e => setEnd(e.target.value)} />
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /> Lançamento</button>
        </div>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card"><p className="text-muted text-sm">Receitas</p><p className="text-2xl font-bold text-green-400 mt-1">{fmt(summary.revenue)}</p></div>
          <div className="card"><p className="text-muted text-sm">Despesas</p><p className="text-2xl font-bold text-red-400 mt-1">{fmt(summary.expense)}</p></div>
          <div className="card"><p className="text-muted text-sm">Lucro</p><p className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-accent' : 'text-red-400'}`}>{fmt(summary.netProfit)}</p></div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <ListSkeleton />
      ) : !transactions?.length ? (
        <EmptyState icon={TrendingUp} title="Nenhuma transação ainda" hint="Lance receitas e despesas para acompanhar o financeiro." />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted font-medium px-6 py-4">Descrição</th>
                  <th className="text-left text-muted font-medium px-6 py-4 hidden sm:table-cell">Categoria</th>
                  <th className="text-right text-muted font-medium px-6 py-4">Valor</th>
                  <th className="text-center text-muted font-medium px-6 py-4 hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions?.map(t => (
                  <tr key={t.id} className="hover:bg-surfaceHover/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {t.type === 'Revenue' ? <TrendingUp size={14} className="text-green-400 flex-shrink-0" /> : <TrendingDown size={14} className="text-red-400 flex-shrink-0" />}
                        <span className="text-content font-medium truncate">{t.description}</span>
                      </div>
                      <span className="text-xs text-subtle sm:hidden">{categories[+t.category] ?? t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-muted hidden sm:table-cell">{categories[+t.category] ?? t.category}</td>
                    <td className={`px-6 py-4 text-right font-semibold ${t.type === 'Revenue' ? 'text-green-400' : 'text-red-400'}`}>{fmt(t.amount)}</td>
                    <td className="px-6 py-4 text-center hidden md:table-cell">
                      <span className={t.status === 'Paid' ? 'badge-completed' : t.status === 'Partial' ? 'badge-confirmed' : 'badge-pending'}>
                        {t.status === 'Paid' ? 'Pago' : t.status === 'Partial' ? 'Parcial' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-content mb-4">Novo Lançamento</h3>
            <form onSubmit={e => { e.preventDefault(); create.mutate() }} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={set('type')}>
                  <option value={0}>Receita</option>
                  <option value={1}>Despesa</option>
                </select>
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.category} onChange={set('category')}>
                  {categories.map((c, i) => <option key={i} value={i}>{c}</option>)}
                </select>
              </div>
              <div><label className="label">Descrição</label><input className="input" value={form.description} onChange={set('description')} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={form.amount} onChange={set('amount')} required /></div>
                <div><label className="label">Data</label><input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} required /></div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={create.isPending} className="btn-primary flex-1">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
