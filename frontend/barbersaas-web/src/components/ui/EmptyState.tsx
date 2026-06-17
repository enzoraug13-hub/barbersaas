import type { ReactNode } from 'react'

/* Estado vazio padronizado: ícone + título + dica (+ ação opcional). */
export function EmptyState({ icon: Icon, title, hint, action }: {
  icon: any; title: string; hint?: string; action?: ReactNode
}) {
  return (
    <div className="card text-center py-12 animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-surfaceHover text-subtle flex items-center justify-center mx-auto mb-3">
        <Icon size={24} />
      </div>
      <p className="text-content font-medium">{title}</p>
      {hint && <p className="text-muted text-sm mt-1">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
