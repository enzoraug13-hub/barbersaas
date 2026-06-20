import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'error' | 'warning' | 'info'
  children: ReactNode
}

export function Badge({ variant = 'default', children, className = '', ...rest }: BadgeProps) {
  return (
    <span className={`ds-badge ds-badge-${variant} ${className}`} {...rest}>
      {children}
    </span>
  )
}
