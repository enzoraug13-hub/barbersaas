/* Primitivas de carregamento. Mesmo formato do conteúdo que vai chegar,
   para a página não "pular" quando os dados entram. */

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`ds-skel ${className}`} style={style} aria-hidden="true" />
}

/** Linhas de lista (avatar + duas linhas de texto). */
export function ListSkeleton({ rows = 4, boxed = true }: { rows?: number; boxed?: boolean }) {
  return (
    <div className={boxed ? 'ds-panel' : ''} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ds-row">
          <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Faixa de indicadores. */
export function LedgerSkeleton({ cells = 4 }: { cells?: number }) {
  return (
    <div className="ds-ledger" style={{ ['--cols' as string]: cells }} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="ds-ledger-cell space-y-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-3/4" />
        </div>
      ))}
    </div>
  )
}

/** Bloco genérico (gráfico, painel). */
export function BlockSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton style={{ height }} className="w-full" />
}
