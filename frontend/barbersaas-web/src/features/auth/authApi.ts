import { api } from '../../lib/api'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'

export const useLogin = () => {
  const setAuth = useAuthStore(s => s.setAuth)
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/auth/login', data)
      return res.data.data
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user)
    },
  })
}

export const useRegister = () => {
  const setAuth = useAuthStore(s => s.setAuth)
  return useMutation({
    mutationFn: async (data: { businessName: string; ownerName: string; email: string; password: string; phone: string }) => {
      const res = await api.post('/auth/register', data)
      return res.data.data as {
        accessToken: string | null
        refreshToken: string | null
        user: { id: string; name: string; email: string; role: string; tenantId: string | null }
        requiresEmailConfirmation?: boolean
      }
    },
    onSuccess: (data) => {
      // Com confirmação de e-mail obrigatória o backend não devolve tokens (conta pendente).
      if (data.accessToken && data.refreshToken) {
        setAuth(data.accessToken, data.refreshToken, data.user)
      }
    },
  })
}

export const useConfirmEmail = () =>
  useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post('/auth/confirm-email', { token })
      return res.data
    },
  })
