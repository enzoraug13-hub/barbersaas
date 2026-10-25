import type { HTMLAttributes, ReactNode } from 'react'

/* Painel: superfície branca com borda. O cabeçalho é opcional; com `split`
   ganha uma linha embaixo (quando logo abaixo vem tabela/lista). */
export function Panel({ title, description, actions, split, children, className = '', bodyClassName, pad, ...rest }: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  split?: boolean
  /** Corpo com padding (padrão quando há título); false p/ tabela/lista colada. */
  pad?: boolean
  bodyClassName?: string
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'title'>) {
  const hasHead = title || actions
  const padBody = pad ?? true
  return (
    <section className={`ds-panel ${className}`} {...rest}>
      {hasHead && (
        <header className={`ds-panel-head ${split ? 'ds-split' : ''}`}>
          <div className="min-w-0">
            {title && <h2 className="ds-panel-title">{title}</h2>}
            {description && <p className="ds-panel-desc">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </header>
      )}
      {children !== undefined && (
        <div className={bodyClassName ?? (padBody ? (hasHead ? (split ? 'ds-panel-pad' : 'ds-panel-body') : 'ds-panel-pad') : '')}>
          {children}
        </div>
      )}
    </section>
  )
}

/* Cabeçalho de página: título + linha de apoio + ações. */
export function PageHeader({ title, subtitle, actions, back }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode
}) {
  return (
    <div className="ds-page-head">
      <div className="min-w-0">
        {back}
        <h1 className="ds-page-title">{title}</h1>
        {subtitle && <p className="ds-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ds-page-actions">{actions}</div>}
    </div>
  )
}
