import type { CSSProperties } from 'react'
import { cx } from './cx'
import { GlassCard } from './GlassCard'

/** Bloco de carregamento com shimmer (translateX — só transform). */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cx('g-skeleton', className)} style={style} aria-hidden="true" />
}

/** Grade de KPIs carregando. */
export function KpiSkeleton({ cells = 4, className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4' }: { cells?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-label="Carregando">
      {Array.from({ length: cells }).map((_, i) => (
        <GlassCard key={i} hover={false}>
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-9" style={{ borderRadius: 'var(--g-radius-sm)' }} />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-1/3 mt-3" />
        </GlassCard>
      ))}
    </div>
  )
}

/** Lista de linhas (avatar + 2 linhas de texto) dentro de um card. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 flex-shrink-0" style={{ borderRadius: 9999 }} />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Área de gráfico carregando. */
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-end gap-3" style={{ height }} role="status" aria-label="Carregando">
      {[45, 70, 35, 85, 55, 65, 40].map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%`, borderRadius: '6px 6px 2px 2px' }} />
      ))}
    </div>
  )
}
