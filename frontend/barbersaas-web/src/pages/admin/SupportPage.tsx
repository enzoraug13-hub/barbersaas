import { useEffect, useRef, useState } from 'react'
import { LifeBuoy, Send, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useMySupportMessages, useSendSupportMessage, useMarkSupportRepliesRead,
} from '../../features/support/supportApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import toast from 'react-hot-toast'

const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

/**
 * Canal de suporte do DONO com o Trimly: ele escreve ("queria tal recurso no meu
 * sistema") e o super admin responde — tudo in-app, no sentido inverso dos avisos.
 * Abrir a página marca as respostas como lidas (o "abri a conversa" do chat),
 * apagando o pontinho do menu.
 */
export default function SupportPage() {
  const { data: messages, isLoading } = useMySupportMessages(true)
  const send = useSendSupportMessage()
  const markRead = useMarkSupportRepliesRead()

  const [body, setBody] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  // Marca as respostas do Trimly como lidas ao ver a conversa (idempotente).
  const unreadReplies = messages?.some(m => m.author === 'superadmin' && !m.readAt) ?? false
  useEffect(() => {
    if (unreadReplies && !markRead.isPending) markRead.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadReplies])

  // Conversa sempre ancorada na última mensagem, como todo chat.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages?.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) { toast.error('Escreva a mensagem.'); return }
    try {
      await send.mutateAsync(body.trim())
      setBody('')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao enviar a mensagem.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="ds-page-title flex items-center gap-2">
          <LifeBuoy size={24} style={{ color: 'var(--accent)' }} /> Suporte
        </h2>
        <p className="ds-page-sub">
          Fale com o Trimly: peça melhorias, tire dúvidas ou relate problemas. A resposta aparece aqui.
        </p>
      </div>

      <Card>
        {/* Histórico */}
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : !messages?.length ? (
          <p className="ds-text-secondary text-center py-8" style={{ fontSize: 'var(--text-sm)' }}>
            Nenhuma mensagem ainda. Escreva abaixo — sua mensagem vai direto pro time do Trimly.
          </p>
        ) : (
          <div ref={threadRef} className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '55vh' }}>
            {messages.map(m => {
              const mine = m.author === 'owner'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5"
                    style={mine
                      ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                      : { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {!mine && (
                      <p className="font-semibold mb-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>
                        Trimly
                      </p>
                    )}
                    <p className="whitespace-pre-wrap" style={{ fontSize: 'var(--text-sm)' }}>{m.body}</p>
                    <p className="flex items-center justify-end gap-1 mt-1" style={{ fontSize: 10, opacity: 0.75 }}>
                      {when(m.createdAt)}
                      {/* Nas MINHAS mensagens, o check duplo = o Trimly leu. */}
                      {mine && m.readAt && <CheckCheck size={12} />}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSend} className="flex items-end gap-2 mt-4"
          style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <textarea className="ds-input flex-1" rows={2} maxLength={2000} value={body}
            placeholder="Escreva sua mensagem pro Trimly…"
            onChange={e => setBody(e.target.value)} />
          <Button type="submit" loading={send.isPending} aria-label="Enviar mensagem">
            <Send size={16} /> Enviar
          </Button>
        </form>
      </Card>
    </div>
  )
}
