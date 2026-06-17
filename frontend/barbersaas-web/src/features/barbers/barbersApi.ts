import { api, publicApi } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Barber } from '../../types'

export const useBarbers = () =>
  useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const res = await api.get('/barbers')
      return res.data.data as Barber[]
    },
  })

export const usePublicBarbers = (slug: string) =>
  useQuery({
    queryKey: ['public-barbers', slug],
    queryFn: async () => {
      const res = await publicApi.get(`/public/${slug}/barbers`)
      return res.data.data as Barber[]
    },
    enabled: !!slug,
  })

export const useCreateBarber = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; phone?: string; bio?: string; commissionType: number; commissionValue: number; googleCalendarId?: string }) => {
      const res = await api.post('/barbers', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

export const useToggleBarber = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { await api.patch(`/barbers/${id}/toggle`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

export type ShiftDto = { id: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }

export const useBarberSchedule = (barberId: string) =>
  useQuery({
    queryKey: ['barber-schedule', barberId],
    queryFn: async () => {
      const res = await api.get(`/barbers/${barberId}/schedule`)
      return res.data.data as { shifts: ShiftDto[] } | null
    },
    enabled: !!barberId,
  })

export const useUpdateSchedule = (barberId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (shifts: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) => {
      await api.put(`/barbers/${barberId}/schedule`, { barberId, shifts })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barber-schedule', barberId] }),
  })
}
