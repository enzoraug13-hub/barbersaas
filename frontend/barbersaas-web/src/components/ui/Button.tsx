import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { btnClass, type ButtonVariant, type ButtonSize } from './btnClass'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Botão só com ícone (quadrado). Exige aria-label. */
  icon?: boolean
  block?: boolean
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary', size = 'md', icon, block, loading, disabled, children,
  className = '', type = 'button', ...rest
}: ButtonProps) {
  const cls = btnClass(variant, size, [
    icon ? 'ds-btn-icon' : '',
    block ? 'ds-btn-block' : '',
    loading ? 'ds-btn-loading' : '',
    className,
  ].filter(Boolean).join(' '))
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="ds-spinner" aria-hidden="true" />}
      <span className="ds-btn-label">{children}</span>
    </button>
  )
}
