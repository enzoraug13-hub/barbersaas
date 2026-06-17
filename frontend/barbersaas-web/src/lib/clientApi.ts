import axios from 'axios'
import { useClientAuthStore } from '../store/clientAuthStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Instância para a ÁREA DO CLIENTE: injeta o token role="client".
export const clientApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

clientApi.interceptors.request.use((config) => {
  const token = useClientAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

clientApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) useClientAuthStore.getState().logout()
    return Promise.reject(error)
  }
)
