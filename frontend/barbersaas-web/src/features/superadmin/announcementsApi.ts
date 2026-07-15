import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/** Aviso como o SUPER ADMIN enxerga: com alvo e contagem de leituras. */
export interface Announcement {
  id: string
  title: string
  body: string
  tenantId: string | null // null = broadcast (todas as barbearias)
  tenantName: string | null
  createdAt: string
  readCount: number
}

export const useAnnouncements = () =>
  useQuery({
    queryKey: ['super-admin-announcements'],
    queryFn: async () => {
      const res = await api.get('/super-admin/announcements')
      return res.data.data as Announcement[]
    },
  })

export const useCreateAnnouncement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { title: string; body: string; tenantId?: string | null }) => {
      const res = await api.post('/super-admin/announcements', data)
      return res.data.data as Announcement
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-announcements'] }),
  })
}

export const useDeleteAnnouncement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super-admin/announcements/${id}`)
      return res.data.data as boolean
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-announcements'] }),
  })
}
