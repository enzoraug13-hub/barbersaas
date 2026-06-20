import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ClientProfile {
  id: string
  name: string
  phone: string
  cpf?: string
  email?: string
  loyaltyPoints?: number
  totalVisits?: number
}

interface ClientAuthState {
  token: string | null
  client: ClientProfile | null
  profileComplete: boolean
  slug: string | null
  setAuth: (token: string, client: ClientProfile, profileComplete: boolean, slug: string) => void
  updateProfile: (patch: Partial<ClientProfile>) => void
  logout: () => void
}

// Sessão do CLIENTE (separada do dono/barbeiro): token role="client".
// Guarda o perfil completo no login — a área do cliente nunca precisa
// rechamar a API só para saber nome/cpf/email.
export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set) => ({
      token: null,
      client: null,
      profileComplete: false,
      slug: null,
      setAuth: (token, client, profileComplete, slug) => set({ token, client, profileComplete, slug }),
      updateProfile: (patch) => set((s) => {
        if (!s.client) return s
        const client = { ...s.client, ...patch }
        const profileComplete = !!client.name && !!client.cpf
        return { client, profileComplete }
      }),
      logout: () => set({ token: null, client: null, profileComplete: false, slug: null }),
    }),
    { name: 'barbersaas-client-auth' }
  )
)
