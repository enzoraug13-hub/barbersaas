import { useEffect, useRef, useState } from 'react'
import { Bell, Gift } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMyAnnouncements, useMarkAnnouncementRead } from '../../features/announcements/announcementsApi'
import { useLoyaltyRedemptions } from '../../features/loyalty/loyaltyApi'

const when = (iso: string) => format(parseISO(iso), "d 'de' MMM, HH:mm", { locale: ptBR })

/**
 * Sino do dono. Junta DUAS fontes sem misturar as tabelas:
 * 1) Avisos do Trimly (Announcements do super admin);
 * 2) Resgates de fidelidade PENDENTES — saem sozinhos quando o dono entrega ou
 *    cancela na aba Fidelidade (o próprio pendente é o "não lido").
 * Só aparece para o Owner (os endpoints exigem) e some quando não há nada.
 */
export function AnnouncementsBell({ enabled, loyaltyEnabled = false, tone = 'light', align = 'right' }: {
  enabled: boolean; loyaltyEnabled?: boolean; tone?: 'light' | 'dark'; align?: 'left' | 'right'
}) {
  const { data: announcements } = useMyAnnouncements(enabled)
  // Só consulta resgates com o programa ligado — desligado, nem há polling.
  const { data: redemptions } = useLoyaltyRedemptions(enabled && loyaltyEnabled, 5 * 60 * 1000)
  const markRead = useMarkAnnouncementRead()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread  = announcements?.filter(a => !a.isRead) ?? []
  const pending = redemptions?.filter(r => r.status === 'Pending') ?? []
  const badge   = unread.length + pending.length

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

  if (!enabled || (!announcements?.length && !pending.length)) return null

  return (
    <div className="relative" ref={panelRef}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className={tone === 'dark' ? 'side-icon-btn relative' : 'ds-btn ds-btn-ghost ds-btn-icon relative'}
        aria-label={badge ? `Notificações: ${badge} pendente(s)` : 'Notificações'}>
        <Bell size={18} strokeWidth={1.75} />
        {badge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-2xs font-semibold t-num"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', boxShadow: `0 0 0 2px ${tone === 'dark' ? 'var(--side-bg)' : 'var(--surface)'}` }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className={`ds-popover mt-2 w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ maxHeight: '70vh' }} role="dialog" aria-label="Notificações">

          {pending.length > 0 && (
            <section>
              <p className="px-4 pt-3 pb-2 text-xs font-medium text-ink-3">Resgates de fidelidade</p>
              {pending.map(r => (
                <Link key={r.id} to="/admin/fidelidade" onClick={() => setOpen(false)}
                  className="flex gap-3 px-4 py-3 border-t border-line hover:bg-surface-2">
                  <Gift size={16} className="text-accent-ink flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-13 text-ink"><span className="font-semibold">{r.clientName}</span> resgatou {r.rewardName}</p>
                    <p className="text-xs text-ink-3 mt-0.5">{when(r.requestedAt)}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {!!announcements?.length && (
            <section className={pending.length ? 'border-t border-line' : ''}>
              <p className="px-4 pt-3 pb-2 text-xs font-medium text-ink-3">Avisos do Trimly</p>
              {announcements.map(a => (
                <div key={a.id} className="px-4 py-3 border-t border-line">
                  <div className="flex items-start gap-2">
                    {!a.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }} aria-label="Não lido" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-13 ${a.isRead ? 'text-ink-2' : 'text-ink font-semibold'}`}>{a.title}</p>
                      <p className="text-13 text-ink-2 mt-1 whitespace-pre-wrap">{a.body}</p>
                      <div className="flex items-center justify-between gap-3 mt-2">
                        <span className="text-xs text-ink-3">{when(a.createdAt)}</span>
                        {!a.isRead && (
                          <button type="button" onClick={() => markRead.mutate(a.id)} disabled={markRead.isPending}
                            className="ds-link text-xs">
                            Marcar como lido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
