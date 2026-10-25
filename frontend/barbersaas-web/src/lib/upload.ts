import { api } from './api'

// Sobe a imagem para /uploads e devolve a URL pública.
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/uploads', fd, { headers: { 'Content-Type': undefined } })
  return res.data.data.url as string
}
