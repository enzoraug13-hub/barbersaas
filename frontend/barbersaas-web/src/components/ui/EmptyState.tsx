import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/* Estado vazio: diz o que falta e qual o próximo passo. `boxed` desenha o
   painel em volta (quando não está dentro de um). */
export function EmptyState({ icon: Icon, title, hint, action, boxed, className = '' }: {
  icon?: LucideIcon; title: string; hint?: ReactNode; action?: ReactNode; boxed?: boolean; className?: string
}) {
  return (
    <div className={`${boxed ? 'ds-panel' : ''} ${className}`}>
      <div className="ds-empty">
        {Icon && <div className="ds-empty-icon"><Icon size={20} strokeWidth={1.75} /></div>}
        <p className="ds-empty-title">{title}</p>
        {hint && <p className="ds-empty-desc">{hint}</p>}
        {action && <div className="ds-empty-action">{action}</div>}
      </div>
    </div>
  )
}
