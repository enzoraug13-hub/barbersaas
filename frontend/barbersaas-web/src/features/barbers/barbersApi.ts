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
    mutationFn: async (data: { name: string; phone?: string; bio?: string; commissionType: number; commissionValue: number; googleCalendarId?: string }) => {
      const res = await api.post('/barbers', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barbers'] }),
  })
}

// Busca um barbeiro específico (inclui inativos) — usado na página de perfil (Parte D).
export const useBarber = (id: string) =>
  useQuery({
    queryKey: ['barber', id],
    queryFn: async () => {
      const res = await api.get(`/barbers/${id}`)
      return res.data.data as Barber
    },
    enabled: !!id,
  })

export type BarberMonthlyPoint = { month: string; revenue: number; appointments: number }

// Série temporal mensal de desempenho do barbeiro (gráfico do perfil — Parte D).
export const useBarberPerformanceSeries = (id: string, months = 6) =>
  useQuery({
    queryKey: ['barber-performance', id, months],
    queryFn: async () => {
      const res = await api.get(`/barbers/${id}/performance`, { params: { months } })
      return res.data.data as BarberMonthlyPoint[]
    },
    enabled: !!id,
  })

export type UpdateBarberInput = {
  name: string
  photoUrl?: string
  bio?: string
  phone?: string
  commissionType: number
  commissionValue: number
  showInPublicPage: boolean
  displayOrder: number
}

export const useUpdateBarber = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBarberInput }) => {
      const res = await api.put(`/barbers/${id}`, data)
      return res.data.data as Barber
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

// --- Google Calendar (OAuth por barbeiro) ---

export type GoogleStatus = { connected: boolean; email: string | null; connectedAt: string | null }

export const useGoogleStatus = (barberId: string) =>
  useQuery({
    queryKey: ['barber-google', barberId],
    queryFn: async () => {
      const res = await api.get(`/barbers/${barberId}/google/status`)
      return res.data.data as GoogleStatus
    },
    enabled: !!barberId,
  })

// O backend devolve a URL de consentimento em JSON (redirect direto não carrega o
// Bearer token) — daqui navegamos o browser inteiro pro Google; a volta é o
// callback do backend, que redireciona pra este perfil com ?google=connected|error.
export const useConnectGoogle = (barberId: string) =>
  useMutation({
    mutationFn: async () => {
      const res = await api.get(`/barbers/${barberId}/google/connect`)
      return (res.data.data as { url: string }).url
    },
    onSuccess: (url) => { window.location.href = url },
  })

export const useDisconnectGoogle = (barberId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => { await api.delete(`/barbers/${barberId}/google`) },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barber-google', barberId] })
      qc.invalidateQueries({ queryKey: ['barber', barberId] })
    },
  })
}

// --- Serviços/preços por barbeiro (Parte B). A UI consome isto nas Partes C/D. ---

export type BarberServiceItem = {
  serviceId: string
  serviceName: string
  basePrice: number
  isOffered: boolean
  customPrice: number | null
  effectivePrice: number
}

export const useBarberServices = (barberId: string) =>
  useQuery({
    queryKey: ['barber-services', barberId],
    queryFn: async () => {
      const res = await api.get(`/barbers/${barberId}/services`)
      return res.data.data as BarberServiceItem[]
    },
    enabled: !!barberId,
  })

// Upsert unitário: customPrice null = oferece pelo preço base.
export const useUpsertBarberService = (barberId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ serviceId, customPrice }: { serviceId: string; customPrice: number | null }) => {
      const res = await api.put(`/barbers/${barberId}/services/${serviceId}`, { customPrice })
      return res.data.data as BarberServiceItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barber-services', barberId] }),
  })
}

export const useRemoveBarberService = (barberId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (serviceId: string) => { await api.delete(`/barbers/${barberId}/services/${serviceId}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barber-services', barberId] }),
  })
}

// Substitui o conjunto inteiro de vínculos do barbeiro.
export const useSetBarberServices = (barberId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (services: Array<{ serviceId: string; customPrice: number | null }>) => {
      const res = await api.put(`/barbers/${barberId}/services`, { services })
      return res.data.data as BarberServiceItem[]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['barber-services', barberId] }),
  })
}
