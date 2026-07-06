import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Imagens de upload (logo/capa/foto) são servidas pela API em /uploads/... com URL
// relativa. Em produção o frontend (Vercel) e a API (Railway) têm origens diferentes:
// a URL relativa cai no rewrite do SPA e volta HTML no lugar da imagem. Este helper
// prefixa a origem da API quando VITE_API_URL é absoluto; com BASE_URL relativo
// (dev), o proxy do Vite já resolve e a URL passa intacta.
const API_ORIGIN = /^https?:\/\//.test(BASE_URL) ? new URL(BASE_URL).origin : ''
export const assetUrl = (url?: string): string | undefined =>
  url && url.startsWith('/') ? API_ORIGIN + url : url

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken)
          original.headers.Authorization = `Bearer ${data.data.accessToken}`
          return api(original)
        } catch {
          useAuthStore.getState().logout()
        }
      }
    }
    return Promise.reject(error)
  }
)

export const publicApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})
