import { useEffect, useRef } from 'react'
import { CheckCheck, Send } from 'lucide-react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '../ui/Button'

export interface ChatMessage { id: string; body: string; createdAt: string; readAt?: string | null; mine: boolean }

const time = (iso: string) => format(parseISO(iso), 'HH:mm')
const dayLabel = (iso: string) => {
  const d = parseISO(iso)
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  const s = format(d, "d 'de' MMMM", { locale: ptBR })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* Conversa (suporte): balões com separador por dia; as minhas à direita.
   `theirsLabel` nomeia o outro lado (ex.: "Trimly"). */
export function ChatThread({ messages, theirsLabel, emptyText, maxHeight = '56vh' }: {
  messages: ChatMessage[]; theirsLabel?: string; emptyText: string; maxHeight?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Sempre ancorada na última mensagem, como todo chat.
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }) }, [messages.length])

  if (!messages.length) {
    return <p className="text-sm text-ink-2 text-center px-6 py-12">{emptyText}</p>
  }

  return (
    <div ref={ref} className="overflow-y-auto px-5 py-4 max-lg:px-4 space-y-2" style={{ maxHeight }}>
      {messages.map((m, i) => {
        const newDay = i === 0 || dayLabel(messages[i - 1].createdAt) !== dayLabel(m.createdAt)
        return (
          <div key={m.id}>
            {newDay && <p className="text-center text-xs text-ink-3 py-2">{dayLabel(m.createdAt)}</p>}
            <div className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-[12px] px-3.5 py-2.5 ${m.mine ? 'rounded-br-[4px]' : 'rounded-bl-[4px] border border-line'}`}
                style={m.mine ? { background: 'var(--ink)', color: '#FFFFFF' } : { background: 'var(--surface-2)', color: 'var(--ink)' }}>
                {!m.mine && theirsLabel && <p className="text-xs font-semibold text-accent-ink mb-0.5">{theirsLabel}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`flex items-center justify-end gap-1 mt-1 text-[11px] t-num ${m.mine ? 'text-white/70' : 'text-ink-3'}`}>
                  {time(m.createdAt)}
                  {m.mine && m.readAt && <CheckCheck size={13} aria-label="Lida" />}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Caixa de escrever + enviar (Ctrl/⌘ + Enter também envia). */
export function ChatComposer({ value, onChange, onSubmit, loading, placeholder, sendLabel = 'Enviar' }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; loading?: boolean; placeholder: string; sendLabel?: string
}) {
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="flex items-end gap-2 p-3 border-t border-line">
      <textarea className="ds-input flex-1 !min-h-[44px] max-h-40" rows={1} maxLength={2000} value={value} placeholder={placeholder}
        aria-label={placeholder}
        onChange={e => { onChange(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight + 2}px` }}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit() } }} />
      <Button type="submit" loading={loading} disabled={!value.trim()} aria-label={sendLabel}>
        <Send size={16} /> <span className="lbl-long">{sendLabel}</span>
      </Button>
    </form>
  )
}
