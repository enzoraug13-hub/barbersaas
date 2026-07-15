import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupportMessage } from '../support/supportApi'

/** Uma conversa na caixa de entrada do super admin: um tenant, última mensagem, não-lidas. */
export interface SupportConversation {
  tenantId: string
  tenantName: string
  lastBody: string
  lastAuthor: 'owner' | 'superadmin'
  lastAt: string
  unreadCount: number
}

export interface SupportThread {
  tenantId: string
  tenantName: string
  messages: SupportMessage[]
}

/** Polling de 5 min: mensagem nova de dono aparece sem recarregar. */
export const useSupportConversations = () =>
  useQuery({
    queryKey: ['super-admin-support-conversations'],
    queryFn: async () => {
      const res = await api.get('/super-admin/support/conversations')
      return res.data.data as SupportConversation[]
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

export const useSupportConversation = (tenantId: string | null) =>
  useQuery({
    queryKey: ['super-admin-support-conversation', tenantId],
    queryFn: async () => {
      const res = await api.get(`/super-admin/support/conversations/${tenantId}`)
      return res.data.data as SupportThread
    },
    enabled: !!tenantId,
  })

export const useReplySupport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tenantId, body }: { tenantId: string; body: string }) => {
      const res = await api.post(`/super-admin/support/conversations/${tenantId}/messages`, { body })
      return res.data.data as SupportMessage
    },
    onSuccess: (_data, { tenantId }) => {
      qc.invalidateQueries({ queryKey: ['super-admin-support-conversation', tenantId] })
      qc.invalidateQueries({ queryKey: ['super-admin-support-conversations'] })
    },
  })
}

/** Marca as mensagens do dono como lidas — disparado ao abrir a conversa. */
export const useMarkSupportConversationRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await api.post(`/super-admin/support/conversations/${tenantId}/read`)
      return res.data.data as { marked: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['super-admin-support-conversations'] })
    },
  })
}
