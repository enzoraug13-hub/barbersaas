import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  children: ReactNode
}

export function Card({ interactive, children, className = '', ...rest }: CardProps) {
  return (
    <div className={`ds-card ${interactive ? 'ds-card-interactive' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}
