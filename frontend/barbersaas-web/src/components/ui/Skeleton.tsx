/* Primitivas de loading do design system (shimmer via .ds-shimmer em components.css). */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ds-shimmer ${className}`} style={{ borderRadius: 'var(--radius-md)' }} />
}

/** Lista de cards (clientes, agendamentos, serviços…). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ds-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Grade de KPIs (dashboard). */
export function CardGridSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="ds-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 4 }}>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
