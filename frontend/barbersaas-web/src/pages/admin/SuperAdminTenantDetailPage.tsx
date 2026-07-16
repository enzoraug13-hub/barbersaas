import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, Copy, Ban, CheckCircle2, KeyRound, Plus, Check, Undo2,
  Receipt, MessagesSquare, Send,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useTenantAccount, useSetTenantStatus, useResetTenantPassword,
} from '../../features/superadmin/superAdminApi'
import {
  useInvoices, useCreateInvoice, useMarkInvoicePaid,
  type Invoice, type InvoiceStatus,
} from '../../features/superadmin/invoicesApi'
import {
  useSupportConversation, useReplySupport, useMarkSupportConversationRead,
} from '../../features/superadmin/supportApi'
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

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const competence = (i: Invoice) => `${String(i.competenceMonth).padStart(2, '0')}/${i.competenceYear}`
const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

const now = new Date()
const emptyInvoiceForm = () => ({
  competenceYear: now.getFullYear(),
  competenceMonth: now.getMonth() + 1,
  amount: 0,
  dueDate: format(new Date(now.getFullYear(), now.getMonth(), 10), 'yyyy-MM-dd'),
  notes: '',
})

/**
 * O "mundo" de UMA barbearia pro super admin: conta, ações, financeiro, faturas
 * e a conversa de suporte — tudo dos Blocos 1/2/4, reunido por tenant. As abas
 * gerais (Faturas, Mensagens) continuam como visão consolidada.
 */
export default function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: tenant, isLoading, error } = useTenantAccount(id)

  const setStatus = useSetTenantStatus()
  const resetPass = useResetTenantPassword()
  const [showReset, setShowReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  // Faturas só desta barbearia (mesma query do Bloco 2, filtrada por tenant).
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(
    statusFilter === 'all' ? { tenantId: id } : { tenantId: id, status: statusFilter })
  const createInvoice = useCreateInvoice()
  const markPaid = useMarkInvoicePaid()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyInvoiceForm)

  // Conversa de suporte embutida (Bloco 4). Abrir a página = li as mensagens.
  const { data: thread } = useSupportConversation(id ?? null)
  const reply = useReplySupport()
  const markRead = useMarkSupportConversationRead()
  const [replyBody, setReplyBody] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) markRead.mutate(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [thread?.messages.length])

  const copyLink = () => {
    if (!tenant) return
    navigator.clipboard.writeText(`${window.location.origin}/b/${tenant.slug}`)
    toast.success('Link público copiado!')
  }

  const handleToggle = async () => {
    if (!tenant || !id) return
    const next = tenant.status === 'Active' ? 'Suspended' : 'Active'
    const verb = next === 'Suspended' ? 'suspender' : 'reativar'
    if (!window.confirm(`Tem certeza que quer ${verb} "${tenant.name}"? ${next === 'Suspended' ? 'O dono não conseguirá mais entrar.' : ''}`)) return
    try {
      await setStatus.mutateAsync({ id, status: next })
      toast.success(next === 'Suspended' ? 'Conta suspensa.' : 'Conta reativada.')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao alterar o status.')
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (newPassword.length < 8) { toast.error('A senha precisa de 8+ caracteres.'); return }
    try {
      await resetPass.mutateAsync({ id, newPassword })
      toast.success('Senha do dono redefinida.')
      setShowReset(false); setNewPassword('')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao redefinir a senha.')
    }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (form.amount <= 0) { toast.error('O valor deve ser maior que zero.'); return }
    try {
      await createInvoice.mutateAsync({
        tenantId: id,
        competenceYear: form.competenceYear,
        competenceMonth: form.competenceMonth,
        amount: form.amount,
        dueDate: form.dueDate,
        notes: form.notes || undefined,
      })
      toast.success('Fatura criada.')
      setShowCreate(false); setForm(emptyInvoiceForm())
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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (!replyBody.trim()) { toast.error('Escreva a mensagem.'); return }
    try {
      await reply.mutateAsync({ tenantId: id, body: replyBody.trim() })
      setReplyBody('')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao enviar a resposta.')
    }
  }

  if (isLoading) return <Card><Skeleton className="h-60" /></Card>
  if (error || !tenant) {
    return (
      <EmptyState icon={Building2} title="Barbearia não encontrada"
        hint="Ela pode ter sido removida. Volte pra lista de contas." />
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da conta */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Link to="/super-admin" className="ds-icon-btn mt-1" aria-label="Voltar pra lista de contas">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h2 className="ds-page-title flex items-center gap-2 flex-wrap">
              <Building2 size={24} style={{ color: 'var(--accent)' }} /> {tenant.name}
              <Badge variant={tenant.status === 'Active' ? 'success' : 'error'}>
                {tenant.status === 'Active' ? 'Ativa' : 'Suspensa'}
              </Badge>
            </h2>
            <button onClick={copyLink} className="flex items-center gap-1 ds-text-secondary hover:underline"
              style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              /b/{tenant.slug} <Copy size={11} />
            </button>
            <p className="ds-text-secondary mt-1" style={{ fontSize: 'var(--text-sm)' }}>
              {tenant.ownerName ?? '—'} · {tenant.ownerEmail ?? '—'} · cliente desde {format(parseISO(tenant.createdAt), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={handleToggle}
            style={{ color: tenant.status === 'Active' ? 'var(--color-error)' : 'var(--color-success)' }}>
            {tenant.status === 'Active' ? <><Ban size={15} /> Suspender</> : <><CheckCircle2 size={15} /> Reativar</>}
          </Button>
          <Button variant="ghost" onClick={() => { setShowReset(true); setNewPassword('') }}>
            <KeyRound size={15} /> Redefinir senha
          </Button>
        </div>
      </div>

      {/* Resumo financeiro da barbearia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Total pago (histórico)</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
            {fmt(tenant.totalPaid)}
          </p>
        </Card>
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Em aberto</p>
          <p className="mt-1" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: tenant.totalOpen > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
            {fmt(tenant.totalOpen)}
          </p>
        </Card>
        <Card>
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Última fatura</p>
          {tenant.lastCompetence ? (
            <p className="mt-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {tenant.lastCompetence}
              <Badge variant={tenant.lastStatus === 'Paid' ? 'success' : 'warning'}>
                {tenant.lastStatus === 'Paid' ? 'Paga' : 'Em aberto'}
              </Badge>
            </p>
          ) : (
            <p className="ds-text-secondary mt-2" style={{ fontSize: 'var(--text-sm)' }}>Nenhuma fatura emitida ainda.</p>
          )}
        </Card>
      </div>

      {/* Faturas da barbearia */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="ds-section-title flex items-center gap-2">
            <Receipt size={17} style={{ color: 'var(--accent)' }} /> Faturas desta barbearia
          </h3>
          <div className="flex items-center gap-2">
            {(['all', 'Open', 'Paid'] as const).map(s => (
              <Button key={s} variant={statusFilter === s ? 'primary' : 'ghost'} onClick={() => setStatusFilter(s)}
                style={{ height: 30, fontSize: 'var(--text-xs)' }}>
                {s === 'all' ? 'Todas' : s === 'Open' ? 'Em aberto' : 'Pagas'}
              </Button>
            ))}
            <Button onClick={() => { setForm(emptyInvoiceForm()); setShowCreate(true) }}
              style={{ height: 30, fontSize: 'var(--text-xs)' }}>
              <Plus size={13} /> Nova fatura
            </Button>
          </div>
        </div>

        {invoicesLoading ? (
          <Card><Skeleton className="h-32" /></Card>
        ) : !invoices?.length ? (
          <EmptyState icon={Receipt} title="Nenhuma fatura"
            hint={statusFilter === 'all' ? 'Crie a primeira fatura desta barbearia pelo botão acima.' : 'Nada com esse filtro.'} />
        ) : (
          <Card className="overflow-x-auto" style={{ padding: 0 }}>
            <table className="w-full" style={{ fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textAlign: 'left' }}>
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
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }} className="ds-text-primary font-medium">{competence(i)}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Conversa de suporte */}
      <div>
        <h3 className="ds-section-title flex items-center gap-2 mb-3">
          <MessagesSquare size={17} style={{ color: 'var(--accent)' }} /> Suporte
        </h3>
        <Card>
          {!thread?.messages.length ? (
            <p className="ds-text-secondary text-center py-6" style={{ fontSize: 'var(--text-sm)' }}>
              Nenhuma mensagem trocada com esta barbearia ainda. Você pode iniciar a conversa abaixo.
            </p>
          ) : (
            <div ref={threadRef} className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '40vh' }}>
              {thread.messages.map(m => {
                const mine = m.author === 'superadmin'
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-2xl px-4 py-2.5"
                      style={mine
                        ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                      <p className="whitespace-pre-wrap" style={{ fontSize: 'var(--text-sm)' }}>{m.body}</p>
                      <p className="text-right mt-1" style={{ fontSize: 10, opacity: 0.75 }}>{when(m.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <form onSubmit={handleReply} className="flex items-end gap-2 mt-4"
            style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <textarea className="ds-input flex-1" rows={2} maxLength={2000} value={replyBody}
              placeholder={`Mensagem para ${tenant.name}…`}
              onChange={e => setReplyBody(e.target.value)} />
            <Button type="submit" loading={reply.isPending} aria-label="Enviar mensagem">
              <Send size={16} /> Enviar
            </Button>
          </form>
        </Card>
      </div>

      {/* Nova fatura (tenant pré-preenchido — sem seletor de barbearia) */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Nova fatura — ${tenant.name}`}>
        <form onSubmit={handleCreateInvoice} className="space-y-4">
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
            <Button type="submit" loading={createInvoice.isPending}>{createInvoice.isPending ? 'Criando…' : 'Criar fatura'}</Button>
          </div>
        </form>
      </Modal>

      {/* Redefinir senha */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)} title={`Redefinir senha — ${tenant.name}`}>
        <form onSubmit={handleReset} className="space-y-4">
          <p className="ds-text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
            A nova senha vale para o dono ({tenant.ownerEmail ?? '—'}). As sessões ativas dele serão encerradas.
          </p>
          <Input label="Nova senha provisória" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            required minLength={8} placeholder="Mínimo 8 caracteres" autoComplete="off" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowReset(false)}>Cancelar</Button>
            <Button type="submit" loading={resetPass.isPending}>{resetPass.isPending ? 'Salvando...' : 'Redefinir'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
