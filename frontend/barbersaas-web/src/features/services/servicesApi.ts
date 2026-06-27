import { api, publicApi } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Service } from '../../types'

export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/services')
      return res.data.data as Service[]
    },
  })

// barberId opcional: quando o tenant tem "preço por barbeiro" ligado, o backend
// devolve effectivePrice já com o preço daquele barbeiro. Sem barberId, vem o preço base.
export const usePublicServices = (slug: string, barberId?: string) =>
  useQuery({
    queryKey: ['public-services', slug, barberId ?? ''],
    queryFn: async () => {
      const res = await publicApi.get(`/public/${slug}/services`, {
        params: barberId ? { barberId } : undefined,
      })
      return res.data.data as Service[]
    },
    enabled: !!slug,
  })

export const useCreateService = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; durationMinutes: number; price: number; colorHex?: string; showInPublicPage: boolean }) => {
      const res = await api.post('/services', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export const useUpdateService = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description?: string; durationMinutes: number; price: number; colorHex?: string; showInPublicPage: boolean }) =>
      api.put(`/services/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export const useDeleteService = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}
