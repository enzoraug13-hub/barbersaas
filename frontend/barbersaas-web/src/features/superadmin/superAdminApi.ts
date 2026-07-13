import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TenantAccount {
  id: string
  name: string
  slug: string
  status: 'Active' | 'Suspended'
  createdAt: string
  ownerName: string | null
  ownerEmail: string | null
}

export const useSuperAdminTenants = () =>
  useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const res = await api.get('/super-admin/tenants')
      return res.data.data as TenantAccount[]
    },
  })

export const useCreateTenantAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { businessName: string; ownerEmail: string; provisionalPassword: string; ownerName?: string }) => {
      const res = await api.post('/super-admin/tenants', data)
      return res.data.data as { tenantId: string; slug: string; ownerEmail: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-tenants'] }),
  })
}

export const useSetTenantStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Active' | 'Suspended' }) => {
      const res = await api.patch(`/super-admin/tenants/${id}/status`, { status })
      return res.data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super-admin-tenants'] }),
  })
}

export const useResetTenantPassword = () =>
  useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      const res = await api.post(`/super-admin/tenants/${id}/reset-password`, { newPassword })
      return res.data.data
    },
  })
