import type { HTMLAttributes, ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cx } from './cx'
import { CountUp } from '../../motion/CountUp'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Pontinho colorido à esquerda (status). */
  dot?: boolean
  children: ReactNode
}

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('g-badge', `g-badge--${tone}`, className)} {...rest}>
      {dot && <span className="g-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Variação percentual (↑ verde / ↓ vermelho) com contagem animada. */
export function Trend({ value, digits = 1 }: { value: number; digits?: number }) {
  const up = value >= 0
  return (
    <span className={cx('g-trend', up ? 'g-trend--up' : 'g-trend--down')}>
      {up ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
      <CountUp value={Math.abs(value)} format={n => `${n.toFixed(digits)}%`} />
    </span>
  )
}
