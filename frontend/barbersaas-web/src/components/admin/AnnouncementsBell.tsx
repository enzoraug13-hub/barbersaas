import { useEffect, useRef, useState } from 'react'
import { Bell, Check, Gift, Globe, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMyAnnouncements, useMarkAnnouncementRead } from '../../features/announcements/announcementsApi'
import { useLoyaltyRedemptions } from '../../features/loyalty/loyaltyApi'

const when = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm", { locale: ptBR })

/**
 * Sino do dono na topbar. Agrega DUAS fontes sem misturar as tabelas:
 * 1) Avisos do Trimly (Announcements do super admin — Bloco 3, intocado);
 * 2) Resgates de fidelidade PENDENTES (LoyaltyRedemptions do tenant) — um resgate
 *    não é um Announcement; ele aparece aqui enquanto Pending e sai sozinho quando
 *    o dono entrega/cancela na aba Fidelidade (o próprio pendente é o "não lido").
 * Renderizado apenas para Owner (o AdminLayout decide) — os endpoints exigem isso.
 */
export function AnnouncementsBell({ enabled, loyaltyEnabled = false }: { enabled: boolean; loyaltyEnabled?: boolean }) {
  const { data: announcements } = useMyAnnouncements(enabled)
  // Só consulta resgates com o programa ligado — desligado, nem polling acontece.
  const { data: redemptions } = useLoyaltyRedemptions(enabled && loyaltyEnabled, 5 * 60 * 1000)
  const markRead = useMarkAnnouncementRead()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread  = announcements?.filter(a => !a.isRead) ?? []
  const pending = redemptions?.filter(r => r.status === 'Pending') ?? []
  const badge   = unread.length + pending.length

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

  if (!enabled || (!announcements?.length && !pending.length)) return null

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(o => !o)} className="ds-icon-btn relative"
        aria-label={badge ? `Notificações: ${badge} pendente(s)` : 'Notificações'}>
        <Bell size={20} />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)', fontSize: 10, fontWeight: 700 }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="ds-card absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] z-40 shadow-lg"
          style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>

          {/* Resgates de fidelidade pendentes — ação mora na aba Fidelidade */}
          {pending.length > 0 && (
            <>
              <p className="ds-text-primary font-medium px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-sm)' }}>
                Resgates de fidelidade
              </p>
              {pending.map(r => (
                <Link key={r.id} to="/admin/fidelidade" onClick={() => setOpen(false)}
                  className="block px-4 py-3 transition-colors hover:opacity-80"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <Gift size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <p className="ds-text-primary font-medium min-w-0 flex-1" style={{ fontSize: 'var(--text-sm)' }}>
                      {r.clientName} resgatou {r.rewardName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="ds-text-secondary" style={{ fontSize: 'var(--text-xs)' }}>{when(r.requestedAt)}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 500 }}>Resolver →</span>
                  </div>
                </Link>
              ))}
            </>
          )}

          {/* Avisos do Trimly (Bloco 3 — comportamento original) */}
          {!!announcements?.length && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
