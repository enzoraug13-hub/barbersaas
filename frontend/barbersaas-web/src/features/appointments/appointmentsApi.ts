import { api, publicApi } from '../../lib/api'
import { clientApi } from '../../lib/clientApi'
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

// Fase 1: reserva temporária (10min) do slot, antes do OTP — não grava nada
// no banco ainda. Usado pelo novo fluxo de agendamento do cliente.
export const useReserveSlot = (slug: string) =>
  useMutation({
    mutationFn: async (data: { barberId: string; serviceId: string; date: string; startTime: string }) => {
      const res = await publicApi.post(`/public/${slug}/reserve`, data)
      return res.data.data as { reservationId: string; expiresAtUtc: string }
    },
  })

// Fase 2: confirma o agendamento já reservado, autenticado pelo token do
// cliente (OTP) — grava no banco vinculado ao clientId do token, sem
// find-or-create por telefone.
export const useConfirmClientAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { reservationId: string; notes?: string }) => {
      const res = await clientApi.post('/client/appointments', data)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['slots'] })
      qc.invalidateQueries({ queryKey: ['client-appointments'] })
    },
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
