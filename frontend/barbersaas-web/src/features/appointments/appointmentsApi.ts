import { api, publicApi } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Appointment, Slot } from '../../types'

export const useAppointments = (date: string, barberId?: string) =>
  useQuery({
    queryKey: ['appointments', date, barberId],
    queryFn: async () => {
      const params: Record<string, string> = { date }
      if (barberId) params.barberId = barberId
      const res = await api.get('/appointments', { params })
      return res.data.data as Appointment[]
    },
    enabled: !!date,
  })

export const useAvailableSlots = (slug: string, barberId: string, serviceId: string, date: string) =>
  useQuery({
    queryKey: ['slots', slug, barberId, serviceId, date],
    queryFn: async () => {
      const res = await publicApi.get(`/public/${slug}/slots`, { params: { barberId, serviceId, date } })
      return res.data.data as Slot[]
    },
    enabled: !!barberId && !!serviceId && !!date,
    staleTime: 30_000,
  })

export const useCreateAppointment = (slug: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { barberId: string; serviceId: string; clientName: string; clientPhone: string; clientEmail?: string; date: string; startTime: string; notes?: string }) => {
      const res = await publicApi.post(`/public/${slug}/appointments`, data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  })
}

export const useAdminCreateAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      barberId: string; serviceId: string; clientName: string; clientPhone: string
      clientEmail?: string; date: string; startTime: string; notes?: string
    }) => {
      const res = await api.post('/appointments', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export const useCancelAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await api.delete(`/appointments/${id}`, { data: { reason } })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export const useCompleteAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: number }) => {
      await api.patch(`/appointments/${id}/complete`, { paymentMethod })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}
