import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Goal } from '../../types'

export const useGoals = () =>
  useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await api.get('/goals')
      return res.data.data as Goal[]
    },
  })

export const useCreateGoal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; targetAmount: number; targetDate?: string }) => {
      const res = await api.post('/goals', data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export const useUpdateGoal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string; targetAmount: number; targetDate?: string }) => {
      const res = await api.put(`/goals/${id}`, data)
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export const useContributeGoal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      const res = await api.post(`/goals/${id}/contribute`, { amount, notes })
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
