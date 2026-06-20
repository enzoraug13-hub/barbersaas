import type { ReactNode } from 'react'

/* Estado vazio padronizado: ícone + título + dica (+ ação opcional). */
export function EmptyState({ icon: Icon, title, hint, action }: {
  icon: any; title: string; hint?: string; action?: ReactNode
}) {
  return (
    <div className="ds-card ds-empty-state">
      <div className="ds-empty-icon"><Icon size={48} /></div>
      <p className="ds-empty-title">{title}</p>
      {hint && <p className="ds-empty-desc">{hint}</p>}
      {action && <div className="ds-empty-action">{action}</div>}
    </div>
  )
}
