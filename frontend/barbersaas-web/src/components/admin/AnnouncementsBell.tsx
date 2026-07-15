import { useEffect, useRef, useState } from 'react'
import { Bell, Check, Globe, Store } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMyAnnouncements, useMarkAnnouncementRead } from '../../features/announcements/announcementsApi'

const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

/**
 * Sino de avisos do Trimly na topbar do dono. Discreto: só o ícone com um badge
 * de não-lidos; clicar abre um painel com os avisos e o botão de marcar como lido.
 * Renderizado apenas para Owner (o AdminLayout decide) — o endpoint é RequireOwner.
 */
export function AnnouncementsBell({ enabled }: { enabled: boolean }) {
  const { data: announcements } = useMyAnnouncements(enabled)
  const markRead = useMarkAnnouncementRead()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = announcements?.filter(a => !a.isRead) ?? []

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!enabled || !announcements?.length) return null

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(o => !o)} className="ds-icon-btn relative"
        aria-label={unread.length ? `Avisos: ${unread.length} não lido(s)` : 'Avisos'}>
        <Bell size={20} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 10, fontWeight: 700 }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="ds-card absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-40 shadow-lg"
          style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          <p className="ds-text-primary font-medium px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)' }}>
            Avisos do Trimly
          </p>
          {announcements.map(a => (
            <div key={a.id} className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)', opacity: a.isRead ? 0.6 : 1 }}>
              <div className="flex items-center gap-2">
                {!a.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                <p className="ds-text-primary font-medium min-w-0 flex-1" style={{ fontSize: 'var(--text-sm)' }}>{a.title}</p>
                {a.isBroadcast
                  ? <Globe size={12} style={{ color: 'var(--text-secondary)' }} />
                  : <Store size={12} style={{ color: 'var(--text-secondary)' }} />}
              </div>
              <p className="ds-text-secondary mt-1 whitespace-pre-wrap" style={{ fontSize: 'var(--text-xs)' }}>{a.body}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="ds-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{when(a.createdAt)}</span>
                {!a.isRead && (
                  <button onClick={() => markRead.mutate(a.id)} disabled={markRead.isPending}
                    className="flex items-center gap-1"
                    style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 500 }}>
                    <Check size={12} /> Marcar como lido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
