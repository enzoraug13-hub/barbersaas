/**
 * Mensagem amigável a partir de um erro do axios, sem `any`: prioriza o primeiro
 * item de `errors` do ApiResponse do backend, depois `message`, depois o fallback.
 * 429 (rate limit) tem mensagem própria — o backend não manda corpo útil nesse caso.
 */
interface ApiErrorShape {
  response?: { status?: number; data?: { errors?: unknown[]; message?: unknown } }
}

/** Status HTTP do erro (undefined quando não é erro de resposta da API). */
export function apiErrorStatus(e: unknown): number | undefined {
  return (e as ApiErrorShape | null)?.response?.status
}

export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as ApiErrorShape | null
  if (err?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  const first = err?.response?.data?.errors?.[0]
  const message = err?.response?.data?.message
  return (typeof first === 'string' ? first : undefined)
    ?? (typeof message === 'string' ? message : undefined)
    ?? fallback
}
