/** Arquivo .ics de um compromisso (abre o "Adicionar à agenda" do celular).
 *  Horário "flutuante" (sem fuso): o calendário usa o fuso do aparelho. */
export function downloadIcs({ title, date, start, durationMinutes, location, description }: {
  title: string
  /** yyyy-MM-dd */
  date: string
  /** HH:mm */
  start: string
  durationMinutes: number
  location?: string
  description?: string
}) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = start.split(':').map(Number)
  const begin = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0)
  const end = new Date(begin.getTime() + durationMinutes * 60_000)
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}T` +
    `${String(dt.getHours()).padStart(2, '0')}${String(dt.getMinutes()).padStart(2, '0')}00`
  const esc = (s: string) => s.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trimly//Agendamento//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${stamp}-${Math.random().toString(36).slice(2)}@trimly`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(begin)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(title)}`,
    location ? `LOCATION:${esc(location)}` : '',
    description ? `DESCRIPTION:${esc(description)}` : '',
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'agendamento.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
