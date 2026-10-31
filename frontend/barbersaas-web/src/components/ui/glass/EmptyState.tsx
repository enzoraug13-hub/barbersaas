import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

/** Estado vazio (ícone em chip de vidro + título + dica + ação opcional). Sem card próprio — vive dentro de um GlassCard. */
export function EmptyState({ icon: Icon, title, hint, action, className }: {
  icon: LucideIcon; title: string; hint?: string; action?: ReactNode; className?: string
}) {
  return (
    <div className={cx('g-empty', className)}>
      <div className="g-empty-icon"><Icon size={22} /></div>
      <p className="g-empty-title">{title}</p>
      {hint && <p className="g-empty-hint">{hint}</p>}
      {action && <div className="g-empty-action">{action}</div>}
    </div>
  )
}
