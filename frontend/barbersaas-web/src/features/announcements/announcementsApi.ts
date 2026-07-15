import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/** Aviso do Trimly como o DONO enxerga: broadcasts + os direcionados à barbearia dele. */
export interface MyAnnouncement {
  id: string
  title: string
  body: string
  isBroadcast: boolean
  createdAt: string
  isRead: boolean
  readAt: string | null
}

/**
 * enabled: o sino só consulta quando o usuário tem permissão (Owner) — barber/admin
 * receberiam 403 do backend (policy RequireOwner) e encheriam o console de erro.
 * refetchInterval discreto: aviso novo aparece em até 5 min sem recarregar a página.
 */
export const useMyAnnouncements = (enabled: boolean) =>
  useQuery({
    queryKey: ['my-announcements'],
    queryFn: async () => {
      const res = await api.get('/announcements')
      return res.data.data as MyAnnouncement[]
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })

export const useMarkAnnouncementRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/announcements/${id}/read`)
      return res.data.data as boolean
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-announcements'] }),
  })
}
