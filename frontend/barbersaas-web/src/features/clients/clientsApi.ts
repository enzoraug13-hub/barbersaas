import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Client } from '../../types'

export const useClients = (search?: string) =>
  useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const res = await api.get('/clients', { params })
      return res.data.data as Client[]
    },
  })

export const useCreateClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string }) => {
      const res = await api.post('/clients', data)
      return res.data.data as Client
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export const useBlockClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.patch(`/clients/${id}/block`, { reason })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export const useUnblockClient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/clients/${id}/unblock`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}
