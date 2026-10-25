import type { BusinessHour } from '../types'
import { toMinutes, hhmm } from './format'

const DAY = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** "Aberto agora, fecha às 18:00" / "Fechado, abre amanhã às 09:00" a partir do horário de funcionamento. */
export function openStatus(hours: BusinessHour[] | undefined, now = new Date()): { open: boolean; text: string } | null {
  if (!hours?.length) return null
  const byDay = new Map(hours.map(h => [h.dayOfWeek, h]))
  const today = now.getDay()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const h = byDay.get(today)

  if (h?.isOpen && h.openTime && h.closeTime) {
    const o = toMinutes(h.openTime), c = toMinutes(h.closeTime)
    if (nowMin >= o && nowMin < c) return { open: true, text: `Aberto agora, fecha às ${hhmm(h.closeTime)}` }
    if (nowMin < o) return { open: false, text: `Fechado, abre hoje às ${hhmm(h.openTime)}` }
  }
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7
    const n = byDay.get(d)
    if (n?.isOpen && n.openTime) {
      const when = i === 1 ? 'amanhã' : DAY[d]
      return { open: false, text: `Fechado, abre ${when} às ${hhmm(n.openTime)}` }
    }
  }
  return { open: false, text: 'Fechado' }
}
