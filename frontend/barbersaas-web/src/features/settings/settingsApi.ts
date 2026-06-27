import { api } from '../../lib/api'
import { useQuery } from '@tanstack/react-query'

// Espelha o SettingsDto do backend (GET /settings). Fonte do logo, nome e cores
// da marca usados nos relatórios PDF e na página de configuração.
export interface TenantSettings {
  businessName: string
  description?: string
  logoUrl?: string
  coverImageUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  phone?: string
  whatsAppNumber?: string
  instagramUrl?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  slotIntervalMinutes: number
  maxAdvanceDays: number
  minNoticeMinutes: number
  allowOnlineBooking: boolean
  requireConfirmation: boolean
  publicSlug: string
}

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data as TenantSettings,
    staleTime: 5 * 60 * 1000,
  })
