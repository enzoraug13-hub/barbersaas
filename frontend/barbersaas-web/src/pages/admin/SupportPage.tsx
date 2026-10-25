import { useEffect, useState } from 'react'
import {
  useMySupportMessages, useSendSupportMessage, useMarkSupportRepliesRead,
} from '../../features/support/supportApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Skeleton } from '../../components/ui/Skeleton'
import { ChatThread, ChatComposer } from '../../components/admin/ChatThread'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

/**
 * Canal do DONO com o Trimly: ele escreve e o super admin responde, tudo no app.
 * Abrir a página marca as respostas como lidas (apaga o ponto do menu).
 */
export default function SupportPage() {
  const { data: messages, isLoading } = useMySupportMessages(true)
  const send = useSendSupportMessage()
  const markRead = useMarkSupportRepliesRead()
  const [body, setBody] = useState('')

  const unreadReplies = messages?.some(m => m.author === 'superadmin' && !m.readAt) ?? false
  useEffect(() => {
    if (unreadReplies && !markRead.isPending) markRead.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadReplies])

  const handleSend = async () => {
    if (!body.trim()) return
    try {
      await send.mutateAsync(body.trim())
      setBody('')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível enviar a mensagem.'))
    }
  }

  return (
    <div className="space-y-5 max-w-[760px]">
      <PageHeader title="Suporte" subtitle="Fale com o time do Trimly: dúvidas, problemas ou pedidos de melhoria. A resposta chega aqui." />
      <Panel pad={false}>
        {isLoading ? <div className="p-5"><Skeleton className="h-40" /></div> : (
          <ChatThread theirsLabel="Trimly"
            emptyText="Nenhuma mensagem ainda. Escreva abaixo: a mensagem vai direto para o time do Trimly."
            messages={(messages ?? []).map(m => ({ id: m.id, body: m.body, createdAt: m.createdAt, readAt: m.readAt, mine: m.author === 'owner' }))} />
        )}
        <ChatComposer value={body} onChange={setBody} onSubmit={handleSend} loading={send.isPending}
          placeholder="Escreva sua mensagem" />
      </Panel>
    </div>
  )
}
