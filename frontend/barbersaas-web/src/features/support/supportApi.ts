import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Mensagem do canal de suporte (dono ↔ Trimly). Mesma forma nos dois lados;
 * readAt em mensagem MINHA = o outro lado leu, readAt em mensagem DELE = eu li.
 */
export interface SupportMessage {
  id: string
  author: 'owner' | 'superadmin'
  body: string
  createdAt: string
  readAt: string | null
}

/**
 * enabled: só consulta quando o usuário é Owner — barber/admin receberiam 403
 * (policy RequireOwner) e encheriam o console de erro. Polling de 5 min, mesmo
 * espírito do sino de avisos: resposta nova aparece sem recarregar a página.
 */
export const useMySupportMessages = (enabled: boolean) =>
  useQuery({
    queryKey: ['my-support-messages'],
    queryFn: async () => {
      const res = await api.get('/support/messages')
      return res.data.data as SupportMessage[]
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

export const useSendSupportMessage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post('/support/messages', { body })
      return res.data.data as SupportMessage
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-support-messages'] }),
  })
}

/** Marca as respostas do Trimly como lidas (em massa) — o "abri a conversa". */
export const useMarkSupportRepliesRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/support/messages/read')
      return res.data.data as { marked: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-support-messages'] }),
  })
}
