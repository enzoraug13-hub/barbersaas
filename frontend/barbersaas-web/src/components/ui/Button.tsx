import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`ds-btn ds-btn-${variant} ${loading ? 'ds-btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="ds-btn-spinner ds-spin" aria-hidden="true" />}
      <span className="ds-btn-label">{children}</span>
    </button>
  )
}
