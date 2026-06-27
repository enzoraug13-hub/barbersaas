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

export interface MonthlyRevenue { month: string; revenue: number; expense: number }

export const useMonthlyRevenue = (months = 6) =>
  useQuery({
    queryKey: ['dashboard-monthly', months],
    queryFn: async () => (await api.get('/dashboard/monthly', { params: { months } })).data.data as MonthlyRevenue[],
    staleTime: 5 * 60 * 1000,
  })

export interface BarberPerformance {
  id: string; name: string; photoUrl?: string; isActive: boolean
  totalAppointments: number; revenue: number; occupancyRate: number
  weeklyAppointments: number[]
}

export const useBarberPerformance = (start?: string, end?: string) =>
  useQuery({
    queryKey: ['dashboard-by-barber', start, end],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (start) params.start = start
      if (end) params.end = end
      return (await api.get('/dashboard/by-barber', { params })).data.data as BarberPerformance[]
    },
    staleTime: 5 * 60 * 1000,
  })

export interface PaymentMethods {
  cash: number; pix: number; credit: number; debit: number; other: number; total: number
}

export const usePaymentMethods = (start?: string, end?: string) =>
  useQuery({
    queryKey: ['dashboard-payment-methods', start, end],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (start) params.start = start
      if (end) params.end = end
      return (await api.get('/dashboard/payment-methods', { params })).data.data as PaymentMethods
    },
    staleTime: 5 * 60 * 1000,
  })
