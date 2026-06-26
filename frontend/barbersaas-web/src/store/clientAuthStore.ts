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
        const profileComplete = !!client.name?.trim() && !!client.cpf?.trim()
        return { client, profileComplete }
      }),
      logout: () => set({ token: null, client: null, profileComplete: false, slug: null }),
    }),
    { name: 'barbersaas-client-auth' }
  )
)

/**
 * Fonte única de verdade pra "o cliente está logado": nunca tratar
 * "tem token" como "tem conta" — token é só a sessão; profileComplete é
 * o cadastro (nome+CPF). Telas não devem ler token/profileComplete do
 * store na mão pra decidir o que renderizar, sempre por aqui.
 *
 * @param freshProfileComplete - quando uma tela já buscou o perfil mais
 * recente da API (ex.: ClientAccountPage com GET /client/me), passa o
 * valor calculado a partir dele aqui pra evitar mostrar a área logada
 * com um profileComplete desatualizado do localStorage por um frame.
 */
export function useClientSession(freshProfileComplete?: boolean) {
  const { token, client, profileComplete: storeProfileComplete, slug, setAuth, updateProfile, logout } = useClientAuthStore()
  const hasToken = !!token
  const profileComplete = freshProfileComplete ?? storeProfileComplete

  return {
    hasToken,
    profileComplete,
    loggedIn: hasToken && profileComplete,
    needsProfile: hasToken && !profileComplete,
    client,
    slug,
    setAuth,
    updateProfile,
    logout,
  }
}
