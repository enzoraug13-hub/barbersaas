import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Fidelidade — visão do dono/admin. Enums chegam como string (JsonStringEnumConverter).
 * O MODO só muda a regra de ganho e o label ("pontos" vs "cortes") — a unidade no
 * banco é a mesma (LoyaltyWallet.TotalPoints).
 */
export type LoyaltyMode = 'Points' | 'Visits'
export type LoyaltyRewardType = 'Service' | 'Product'
export type LoyaltyRedemptionStatus = 'Pending' | 'Delivered' | 'Cancelled'

export interface LoyaltyProgram {
  isEnabled: boolean
  mode: LoyaltyMode
  pointsPerReal: number
}

export interface LoyaltyReward {
  id: string
  name: string
  description: string | null
  type: LoyaltyRewardType
  serviceId: string | null
  productId: string | null
  linkedName: string | null
  cost: number
  isActive: boolean
}

export interface ClientBalance {
  clientId: string
  clientName: string
  phone: string
  totalPoints: number
  lifetimePoints: number
}

export interface Redemption {
  id: string
  clientId: string
  clientName: string
  clientPhone: string
  rewardName: string
  costPaid: number
  status: LoyaltyRedemptionStatus
  requestedAt: string
  resolvedAt: string | null
}

/** Label da unidade conforme o modo do programa. */
export const unitLabel = (mode: LoyaltyMode | undefined, n: number) =>
  mode === 'Visits' ? (n === 1 ? 'corte' : 'cortes') : (n === 1 ? 'ponto' : 'pontos')

/**
 * enabled: sidebar/telas só consultam para owner/admin (o endpoint é
 * RequireOwnerOrAdmin; barber levaria 403 e encheria o console de erro).
 */
export const useLoyaltyProgram = (enabled = true) =>
  useQuery({
    queryKey: ['loyalty-program'],
    queryFn: async () => (await api.get('/loyalty/program')).data.data as LoyaltyProgram,
    enabled,
    staleTime: 5 * 60 * 1000,
  })

export const useUpdateLoyaltyProgram = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: LoyaltyProgram) => (await api.put('/loyalty/program', p)).data.data as boolean,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-program'] }),
  })
}

export const useLoyaltyRewards = (enabled = true) =>
  useQuery({
    queryKey: ['loyalty-rewards'],
    queryFn: async () => (await api.get('/loyalty/rewards')).data.data as LoyaltyReward[],
    enabled,
  })

export interface SaveRewardInput {
  id?: string
  name: string
  description?: string
  type: LoyaltyRewardType
  serviceId?: string | null
  productId?: string | null
  cost: number
  isActive: boolean
}

export const useSaveLoyaltyReward = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveRewardInput) => {
      const res = input.id
        ? await api.put(`/loyalty/rewards/${input.id}`, input)
        : await api.post('/loyalty/rewards', input)
      return res.data.data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }),
  })
}

export const useLoyaltyBalances = (enabled = true) =>
  useQuery({
    queryKey: ['loyalty-balances'],
    queryFn: async () => (await api.get('/loyalty/balances')).data.data as ClientBalance[],
    enabled,
  })

/**
 * refetchInterval no uso do sino: resgate novo aparece em até 5 min sem
 * recarregar (mesmo espírito do useMyAnnouncements).
 */
export const useLoyaltyRedemptions = (enabled = true, refetchMs?: number) =>
  useQuery({
    queryKey: ['loyalty-redemptions'],
    queryFn: async () => (await api.get('/loyalty/redemptions')).data.data as Redemption[],
    enabled,
    refetchInterval: refetchMs,
    staleTime: 60 * 1000,
  })

export const useResolveRedemption = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, deliver }: { id: string; deliver: boolean }) =>
      (await api.post(`/loyalty/redemptions/${id}/${deliver ? 'deliver' : 'cancel'}`)).data.data as boolean,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-redemptions'] })
      qc.invalidateQueries({ queryKey: ['loyalty-balances'] })
    },
  })
}
