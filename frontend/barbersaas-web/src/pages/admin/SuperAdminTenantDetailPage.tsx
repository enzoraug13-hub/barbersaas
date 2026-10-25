import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Building2, Copy, ExternalLink, KeyRound, Plus, Receipt } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { useTenantAccount } from '../../features/superadmin/superAdminApi'
import { useInvoices, type InvoiceStatus } from '../../features/superadmin/invoicesApi'
import {
  useSupportConversation, useReplySupport, useMarkSupportConversationRead,
} from '../../features/superadmin/supportApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Ledger } from '../../components/ui/Ledger'
import { Segmented } from '../../components/ui/Controls'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, LedgerSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { InvoiceList, NewInvoiceModal } from '../../components/admin/InvoiceUI'
import { ChatThread, ChatComposer } from '../../components/admin/ChatThread'
import { ResetPasswordModal, TenantStatusModal } from '../../components/admin/TenantAccessModals'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl } from '../../lib/format'
import { apiErrorMessage } from '../../lib/apiError'

/* O "mundo" de UMA barbearia para o super admin: conta, cobrança e conversa de
   suporte reunidas. As telas gerais (Faturas, Mensagens) seguem como visão consolidada. */
export default function SuperAdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const desktop = useIsDesktop()
  const { data: tenant, isLoading, error } = useTenantAccount(id)

  const [showReset, setShowReset] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  // Faturas só desta barbearia.
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const { data: invoices, isLoading: invoicesLoading } = useInvoices(
    statusFilter === 'all' ? { tenantId: id } : { tenantId: id, status: statusFilter })

  // Conversa de suporte embutida. Abrir a página = li as mensagens.
  const { data: thread } = useSupportConversation(id ?? null)
  const reply = useReplySupport()
  const { mutate: markRead } = useMarkSupportConversationRead()
  const [replyBody, setReplyBody] = useState('')

  useEffect(() => { if (id) markRead(id) }, [id, markRead])

  const handleReply = async () => {
    if (!id || !replyBody.trim()) return
    try {
      await reply.mutateAsync({ tenantId: id, body: replyBody.trim() })
      setReplyBody('')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível enviar a mensagem.'))
    }
  }

  const back = <Link to="/super-admin" className="ds-back"><ChevronLeft size={16} /> Barbearias</Link>

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <LedgerSkeleton cells={3} />
        <ListSkeleton rows={3} />
      </div>
    )
  }
  if (error || !tenant) {
    return (
      <div className="space-y-5">
        {back}
        <EmptyState boxed icon={Building2} title="Barbearia não encontrada" hint="Ela pode ter sido removida. Volte para a lista de barbearias." />
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/b/${tenant.slug}`
  const copyLink = () => { navigator.clipboard.writeText(publicUrl); toast.success('Link de agendamento copiado.') }
  const tenantRef = { id: tenant.id, name: tenant.name, slug: tenant.slug, ownerEmail: tenant.ownerEmail, status: tenant.status }

  return (
    <div className="space-y-6">
      <PageHeader back={back}
        title={
          <span className="flex items-center gap-3 min-w-0">
            <Avatar name={tenant.name} size={40} className="max-lg:hidden" />
            <span className="truncate">{tenant.name}</span>
            {tenant.status === 'Active' ? <Pill tone="ok">Ativa</Pill> : <Pill tone="bad">Suspensa</Pill>}
          </span>
        }
        subtitle={
          <>
            {tenant.ownerName ?? 'Dono sem nome'}{tenant.ownerEmail ? `, ${tenant.ownerEmail}` : ''}. Cliente desde {format(parseISO(tenant.createdAt), 'dd/MM/yyyy')}.
          </>
        }
        actions={<>
          <Button variant="secondary" onClick={() => setShowReset(true)}><KeyRound size={15} /> <span className="lbl-long">Redefinir senha</span><span className="lbl-short">Senha</span></Button>
          <Button variant={tenant.status === 'Active' ? 'danger-ghost' : 'primary'} onClick={() => setShowStatus(true)}>
            {tenant.status === 'Active' ? 'Suspender' : 'Reativar'}
          </Button>
        </>} />

      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-ink-2">Página de agendamento:</span>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="ds-link inline-flex items-center gap-1 break-all">
          {window.location.host}/b/{tenant.slug} <ExternalLink size={13} />
        </a>
        <Button variant="ghost" size="sm" onClick={copyLink}><Copy size={14} /> Copiar</Button>
      </div>

      <Ledger items={[
        { label: 'Total pago', value: brl(tenant.totalPaid), foot: <span>desde o início</span> },
        { label: 'Em aberto', value: brl(tenant.totalOpen) },
        {
          label: 'Última fatura',
          value: tenant.lastCompetence ?? <span className="text-ink-3">Nenhuma</span>,
          foot: tenant.lastCompetence
            ? <>{tenant.lastStatus === 'Paid' ? <Pill tone="ok">Paga</Pill> : <Pill tone="warn">Em aberto</Pill>}{tenant.lastAmount != null && <span className="t-num">{brl(tenant.lastAmount)}</span>}</>
            : undefined,
        },
      ]} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6 items-start">
        <Panel pad={false} split title="Faturas"
          actions={<>
            <span className="max-sm:hidden">
              <Segmented value={statusFilter} onChange={setStatusFilter} ariaLabel="Filtrar faturas" options={[
                { value: 'all', label: 'Todas' }, { value: 'Open', label: 'Em aberto' }, { value: 'Paid', label: 'Pagas' },
              ]} />
            </span>
            <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Nova</Button>
          </>}>
          <div className="sm:hidden px-4 pt-3">
            <Segmented value={statusFilter} onChange={setStatusFilter} ariaLabel="Filtrar faturas" options={[
              { value: 'all', label: 'Todas' }, { value: 'Open', label: 'Em aberto' }, { value: 'Paid', label: 'Pagas' },
            ]} />
          </div>
          {invoicesLoading ? <ListSkeleton rows={3} boxed={false} /> : !invoices?.length ? (
            <EmptyState icon={Receipt}
              title={statusFilter === 'all' ? 'Nenhuma fatura emitida' : 'Nenhuma fatura com esse filtro'}
              hint={statusFilter === 'all' ? 'Emita a primeira fatura desta barbearia.' : undefined}
              action={statusFilter === 'all' ? <Button variant="secondary" onClick={() => setShowCreate(true)}><Plus size={16} /> Nova fatura</Button> : undefined} />
          ) : (
            <InvoiceList invoices={invoices} desktop={desktop} />
          )}
        </Panel>

        <Panel pad={false} split title="Suporte" description="Conversa com o dono"
          actions={<Link to="/super-admin/mensagens" className={btnClass('ghost', 'sm')}>Todas as conversas</Link>}>
          <ChatThread maxHeight="420px" theirsLabel={tenant.name}
            emptyText="Nenhuma mensagem com esta barbearia ainda. Escreva abaixo para começar a conversa."
            messages={(thread?.messages ?? []).map(m => ({ id: m.id, body: m.body, createdAt: m.createdAt, readAt: m.readAt, mine: m.author === 'superadmin' }))} />
          <ChatComposer value={replyBody} onChange={setReplyBody} onSubmit={handleReply} loading={reply.isPending}
            placeholder={`Mensagem para ${tenant.name}`} />
        </Panel>
      </div>

      {showCreate && (
        <NewInvoiceModal tenant={{ id: tenant.id, name: tenant.name }} suggestAmount={() => tenant.lastAmount ?? undefined}
          onClose={() => setShowCreate(false)} />
      )}
      {showReset && <ResetPasswordModal tenant={tenantRef} onClose={() => setShowReset(false)} />}
      {showStatus && <TenantStatusModal tenant={tenantRef} onClose={() => setShowStatus(false)} />}
    </div>
  )
}
