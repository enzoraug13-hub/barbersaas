import { api } from '../../lib/api'
import { useQuery } from '@tanstack/react-query'
import type { DashboardData } from '../../types'

export const useDashboard = (start?: string, end?: string) =>
  useQuery({
    queryKey: ['dashboard', start, end],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (start) params.start = start
      if (end) params.end = end
      const res = await api.get('/dashboard', { params })
      return res.data.data as DashboardData
    },
    staleTime: 5 * 60 * 1000,
  })
