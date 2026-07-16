import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type InvoiceStatus = 'Open' | 'Paid'

export interface Invoice {
  id: string
  tenantId: string
  tenantName: string
  competenceYear: number
  competenceMonth: number
  amount: number
  dueDate: string
  status: InvoiceStatus
  paidAt: string | null
  receiptUrl: string | null
  notes: string | null
}

export interface BillingSummary {
  received: number
  outstanding: number
  paidCount: number
  openCount: number
  from: string
  to: string
  monthly: { year: number; month: number; label: string; received: number }[]
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  from?: string
  to?: string
  tenantId?: string
}

// Invalidar faturas invalida também o resumo, a lista de contas e o detalhe da
// barbearia — o "em aberto" da lista e o card financeiro do detalhe derivam das
// mesmas faturas, e ficariam defasados após criar/pagar/reabrir uma.
const invalidateBilling = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['super-admin-invoices'] })
  qc.invalidateQueries({ queryKey: ['super-admin-billing-summary'] })
  qc.invalidateQueries({ queryKey: ['super-admin-tenants'] })
  qc.invalidateQueries({ queryKey: ['super-admin-tenant'] })
}

export const useInvoices = (filters: InvoiceFilters = {}) =>
  useQuery({
    queryKey: ['super-admin-invoices', filters],
    queryFn: async () => {
      const res = await api.get('/super-admin/invoices', { params: filters })
      return res.data.data as Invoice[]
    },
  })

export const useBillingSummary = (months = 6) =>
  useQuery({
    queryKey: ['super-admin-billing-summary', months],
    queryFn: async () => {
      const res = await api.get('/super-admin/billing/summary', { params: { months } })
      return res.data.data as BillingSummary
    },
  })

export const useCreateInvoice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      tenantId: string; competenceYear: number; competenceMonth: number
      amount: number; dueDate: string; notes?: string
    }) => {
      const res = await api.post('/super-admin/invoices', data)
      return res.data.data as Invoice
    },
    onSuccess: () => invalidateBilling(qc),
  })
}

export const useMarkInvoicePaid = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const res = await api.patch(`/super-admin/invoices/${id}/paid`, { paid })
      return res.data.data
    },
    onSuccess: () => invalidateBilling(qc),
  })
}

export const useAttachReceipt = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, receiptUrl }: { id: string; receiptUrl: string | null }) => {
      const res = await api.post(`/super-admin/invoices/${id}/receipt`, { receiptUrl })
      return res.data.data
    },
    onSuccess: () => invalidateBilling(qc),
  })
}
