import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ClientProfile {
  id: string
  name: string
  phone: string
  email?: string
  loyaltyPoints?: number
  totalVisits?: number
}

interface ClientAuthState {
  token: string | null
  client: ClientProfile | null
  slug: string | null
  setAuth: (token: string, client: ClientProfile, slug: string) => void
  logout: () => void
}

// Sessão do CLIENTE (separada do dono/barbeiro): token role="client".
export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      token: null,
      client: null,
      slug: null,
      setAuth: (token, client, slug) => set({ token, client, slug }),
      logout: () => set({ token: null, client: null, slug: null }),
    }),
    { name: 'barbersaas-client-auth' }
  )
)
