import type { ReactNode } from 'react'

/* Interruptor acessível (role=switch). */
export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className="ds-switch" onClick={() => onChange(!checked)} />
  )
}

/* Linha de opção com interruptor: título + descrição, a linha inteira clica. */
export function SwitchRow({ title, description, checked, onChange }: {
  title: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="ds-option items-center" onClick={() => onChange(!checked)} role="presentation">
      <div className="flex-1 min-w-0">
        <p className="ds-option-title">{title}</p>
        {description && <p className="ds-option-desc">{description}</p>}
      </div>
      <span onClick={e => e.stopPropagation()}>
        <Switch checked={checked} onChange={onChange} label={title} />
      </span>
    </div>
  )
}

/* Controle segmentado (filtros de visão). */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  ariaLabel?: string
}) {
  return (
    <div className="ds-seg" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="ds-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* Abas com sublinhado (troca de seção dentro da página). */
export function Tabs<T extends string>({ value, onChange, options, ariaLabel }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; badge?: number }[]
  ariaLabel?: string
}) {
  return (
    <div className="ds-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className="ds-tab" onClick={() => onChange(o.value)}>
          {o.label}
          {!!o.badge && <span className="ds-count ds-count-accent">{o.badge > 9 ? '9+' : o.badge}</span>}
        </button>
      ))}
    </div>
  )
}
