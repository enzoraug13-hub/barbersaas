import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessagesSquare, ChevronLeft } from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import toast from 'react-hot-toast'
import {
  useSupportConversations, useSupportConversation,
  useReplySupport, useMarkSupportConversationRead,
} from '../../features/superadmin/supportApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { btnClass } from '../../components/ui/btnClass'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton, Skeleton } from '../../components/ui/Skeleton'
import { ChatThread, ChatComposer } from '../../components/admin/ChatThread'
import { apiErrorMessage } from '../../lib/apiError'

const shortWhen = (iso: string) => {
  const d = parseISO(iso)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'ontem'
  return format(d, 'dd/MM')
}

/* Caixa de entrada do suporte: uma conversa por barbearia. Lista e conversa lado
   a lado no desktop; no celular a conversa abre por cima da lista.
   Abrir uma conversa marca as mensagens do dono como lidas. */
export default function SuperAdminSupportPage() {
  const { data: conversations, isLoading } = useSupportConversations()
  const [selected, setSelected] = useState<string | null>(null)
  const { data: thread, isLoading: threadLoading } = useSupportConversation(selected)
  const reply = useReplySupport()
  const { mutate: markRead } = useMarkSupportConversationRead()
  const [body, setBody] = useState('')

  useEffect(() => { if (selected) markRead(selected) }, [selected, markRead])

  const handleReply = async () => {
    if (!selected || !body.trim()) return
    try {
      await reply.mutateAsync({ tenantId: selected, body: body.trim() })
      setBody('')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível enviar a resposta.'))
    }
  }

  const open = (id: string) => { setSelected(id); setBody('') }
  const unread = conversations?.reduce((s, c) => s + c.unreadCount, 0) ?? 0
  const current = conversations?.find(c => c.tenantId === selected)

  return (
    <div className="space-y-5">
      <PageHeader title="Mensagens"
        subtitle={unread ? `${unread} ${unread === 1 ? 'mensagem nova' : 'mensagens novas'} das barbearias` : 'Dúvidas, pedidos e problemas que as barbearias mandam pelo painel.'} />

      {isLoading ? <ListSkeleton rows={4} /> : !conversations?.length ? (
        <EmptyState boxed icon={MessagesSquare} title="Nenhuma mensagem ainda"
          hint="Quando um dono escrever pelo Suporte do painel dele, a conversa aparece aqui." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
          {/* Lista: no celular some enquanto uma conversa está aberta. */}
          <Panel pad={false} className={selected ? 'max-lg:hidden' : ''}>
            <ul className="ds-list">
              {[...conversations].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).map(c => {
                const active = c.tenantId === selected
                return (
                  <li key={c.tenantId}>
                    <button type="button" onClick={() => open(c.tenantId)} aria-current={active ? 'true' : undefined}
                      className="ds-row items-start" style={active ? { background: 'var(--accent-soft)' } : undefined}>
                      <Avatar name={c.tenantName} size={36} />
                      <div className="ds-row-main">
                        <div className="flex items-baseline gap-2">
                          <p className={`flex-1 truncate ${c.unreadCount ? 'font-semibold' : 'font-medium'}`}>{c.tenantName}</p>
                          <span className={`text-xs t-num flex-shrink-0 ${c.unreadCount ? 'text-accent-ink font-semibold' : 'text-ink-3'}`}>{shortWhen(c.lastAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`flex-1 truncate text-13 ${c.unreadCount ? 'text-ink' : 'text-ink-2'}`}>
                            {c.lastAuthor === 'superadmin' ? 'Você: ' : ''}{c.lastBody}
                          </p>
                          {c.unreadCount > 0 && <span className="ds-count ds-count-accent">{c.unreadCount > 9 ? '9+' : c.unreadCount}</span>}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <div className={selected ? '' : 'max-lg:hidden'}>
            {!selected ? (
              <Panel>
                <EmptyState icon={MessagesSquare} title="Escolha uma conversa" hint="As mensagens da barbearia aparecem aqui, com a caixa para responder." />
              </Panel>
            ) : (
              <Panel pad={false} split
                title={
                  <span className="flex items-center gap-2 min-w-0">
                    <Button variant="ghost" icon size="sm" className="lg:hidden -ml-2" onClick={() => setSelected(null)} aria-label="Voltar para as conversas">
                      <ChevronLeft size={18} />
                    </Button>
                    <span className="truncate">{thread?.tenantName ?? current?.tenantName ?? 'Conversa'}</span>
                  </span>
                }
                actions={<Link to={`/super-admin/contas/${selected}`} className={btnClass('ghost', 'sm')}>Ver conta</Link>}>
                {threadLoading ? <div className="p-5"><Skeleton className="h-40" /></div> : (
                  <ChatThread maxHeight="min(56vh, 520px)" theirsLabel={thread?.tenantName}
                    emptyText="Nenhuma mensagem nesta conversa."
                    messages={(thread?.messages ?? []).map(m => ({ id: m.id, body: m.body, createdAt: m.createdAt, readAt: m.readAt, mine: m.author === 'superadmin' }))} />
                )}
                <ChatComposer value={body} onChange={setBody} onSubmit={handleReply} loading={reply.isPending}
                  placeholder={`Responder ${thread?.tenantName ?? current?.tenantName ?? 'a barbearia'}`} sendLabel="Responder" />
              </Panel>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
