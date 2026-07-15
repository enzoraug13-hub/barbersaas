import { useEffect, useRef, useState } from 'react'
import { MessagesSquare, Send, ArrowLeft, Store } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useSupportConversations, useSupportConversation,
  useReplySupport, useMarkSupportConversationRead,
} from '../../features/superadmin/supportApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

/**
 * Caixa de entrada de suporte do super admin: uma conversa por barbearia
 * (destaque pras não-lidas), thread ao lado no desktop / em tela cheia no mobile.
 * Abrir uma conversa marca as mensagens do dono como lidas.
 */
export default function SuperAdminSupportPage() {
  const { data: conversations, isLoading } = useSupportConversations()
  const [selected, setSelected] = useState<string | null>(null)
  const { data: thread, isLoading: threadLoading } = useSupportConversation(selected)
  const reply = useReplySupport()
  const markRead = useMarkSupportConversationRead()

  const [body, setBody] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  // Abrir a conversa = li as mensagens do dono (idempotente; zera o contador da lista).
  useEffect(() => {
    if (selected) markRead.mutate(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [thread?.messages.length])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!body.trim()) { toast.error('Escreva a mensagem.'); return }
    try {
      await reply.mutateAsync({ tenantId: selected, body: body.trim() })
      setBody('')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao enviar a resposta.')
    }
  }

  const list = (
    <div className="space-y-2">
      {conversations?.map(c => {
        const active = c.tenantId === selected
        return (
          <button key={c.tenantId} type="button" onClick={() => setSelected(c.tenantId)}
            className="w-full text-left rounded-xl px-4 py-3 transition-colors"
            style={{
              background: active ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
            }}>
            <div className="flex items-center gap-2">
              <Store size={14} style={{ color: 'var(--accent)' }} className="flex-shrink-0" />
              <p className={`ds-text-primary min-w-0 flex-1 truncate ${c.unreadCount ? 'font-semibold' : 'font-medium'}`}
                style={{ fontSize: 'var(--text-sm)' }}>
                {c.tenantName}
              </p>
              {c.unreadCount > 0 && <Badge variant="accent">{c.unreadCount}</Badge>}
            </div>
            <p className="ds-text-secondary truncate mt-1" style={{ fontSize: 'var(--text-xs)' }}>
              {c.lastAuthor === 'superadmin' ? 'Você: ' : ''}{c.lastBody}
            </p>
            <p className="ds-text-secondary mt-0.5" style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>
              {when(c.lastAt)}
            </p>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="ds-page-title flex items-center gap-2">
          <MessagesSquare size={24} style={{ color: 'var(--accent)' }} /> Mensagens
        </h2>
        <p className="ds-page-sub">O que as barbearias escrevem pro Trimly — pedidos, dúvidas e problemas.</p>
      </div>

      {isLoading ? (
        <Card><Skeleton className="h-32" /></Card>
      ) : !conversations?.length ? (
        <EmptyState icon={MessagesSquare} title="Nenhuma mensagem ainda"
          hint="Quando um dono escrever pelo painel dele (Suporte), a conversa aparece aqui." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px,1fr] items-start">
          {/* Lista de conversas — no mobile some quando uma conversa está aberta. */}
          <div className={selected ? 'hidden lg:block' : ''}>{list}</div>

          {/* Thread */}
          <div className={selected ? '' : 'hidden lg:block'}>
            {!selected ? (
              <Card>
                <p className="ds-text-secondary text-center py-10" style={{ fontSize: 'var(--text-sm)' }}>
                  Selecione uma conversa ao lado.
                </p>
              </Card>
            ) : (
              <Card>
                <div className="flex items-center gap-2 mb-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <button type="button" onClick={() => setSelected(null)} className="ds-icon-btn lg:hidden"
                    aria-label="Voltar pra lista de conversas">
                    <ArrowLeft size={18} />
                  </button>
                  <Store size={16} style={{ color: 'var(--accent)' }} />
                  <p className="ds-text-primary font-medium">{thread?.tenantName ?? '…'}</p>
                </div>

                {threadLoading ? (
                  <Skeleton className="h-40" />
                ) : (
                  <div ref={threadRef} className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '50vh' }}>
                    {thread?.messages.map(m => {
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
                  <textarea className="ds-input flex-1" rows={2} maxLength={2000} value={body}
                    placeholder={`Responder ${thread?.tenantName ?? 'a barbearia'}…`}
                    onChange={e => setBody(e.target.value)} />
                  <Button type="submit" loading={reply.isPending} aria-label="Enviar resposta">
                    <Send size={16} /> Responder
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
