import type { Tone } from '../components/ui/Badge'

export const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Moeda sem centavos quando o valor é inteiro (R$ 45 em vez de R$ 45,00) — p/ números grandes. */
export const brlShort = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2,
  })

export const num = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR')

/** Valores grandes em eixo de gráfico: R$ 18,6 mil. */
export const brlCompact = (n: number) =>
  Math.abs(n) >= 1000
    ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
    : brlShort(n)

/** Só a primeira letra maiúscula ("sábado, 24 de outubro" → "Sábado, 24 de outubro"). */
export const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Dia da semana abreviado, sem ponto (0 = domingo). */
export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Primeiro nome (p/ saudações e colunas estreitas). */
export const firstName = (name?: string | null) => (name ?? '').trim().split(/\s+/)[0] ?? ''

/** "09:30:00" | "09:30" → "09:30" */
export const hhmm = (t?: string | null) => (t ?? '').slice(0, 5)

/** "09:30" → minutos desde 00:00 */
export const toMinutes = (t?: string | null) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/* ---------- Status de agendamento ---------- */
export const appointmentStatus: Record<string, { label: string; tone: Tone }> = {
  Pending:   { label: 'Pendente',        tone: 'warn' },
  Confirmed: { label: 'Confirmado',      tone: 'info' },
  Completed: { label: 'Concluído',       tone: 'ok' },
  Cancelled: { label: 'Cancelado',       tone: 'neutral' },
  NoShow:    { label: 'Faltou',          tone: 'bad' },
}
export const statusOf = (s: string) => appointmentStatus[s] ?? { label: s, tone: 'neutral' as Tone }
