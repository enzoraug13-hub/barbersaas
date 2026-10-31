import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { cx } from './cx'

export interface TabItem<V extends string> {
  value: V
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps<V extends string> {
  items: TabItem<V>[]
  value: V
  onChange: (value: V) => void
  className?: string
  'aria-label'?: string
}

/** Segmented control com pílula deslizante (layoutId) e navegação por setas. */
export function Tabs<V extends string>({ items, value, onChange, className, ...aria }: TabsProps<V>) {
  const group = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex(t => t.value === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].value)
    refs.current[next]?.focus()
  }

  return (
    <LayoutGroup id={group}>
      <div role="tablist" className={cx('g-tabs', className)} onKeyDown={onKeyDown} {...aria}>
        {items.map((t, i) => {
          const selected = t.value === value
          return (
            <button
              key={t.value}
              ref={el => { refs.current[i] = el }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="g-tab"
              onClick={() => onChange(t.value)}
            >
              {selected && (
                <motion.span layoutId="g-tab-pill" className="g-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
              )}
              <span className="g-tab-label">{t.icon}{t.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
