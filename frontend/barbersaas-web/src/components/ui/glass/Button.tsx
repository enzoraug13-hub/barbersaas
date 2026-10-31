import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  /** Botão só com ícone (quadrado). Lembre do aria-label. */
  icon?: boolean
  block?: boolean
  loading?: boolean
  children?: ReactNode
}

/** Destaque (accent) só no primary — CTA. Pressionar: scale .97. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, block, loading, disabled, className, children, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx(
        'g-btn', `g-btn--${variant}`,
        size !== 'md' && `g-btn--${size}`,
        icon && 'g-btn--icon', block && 'g-btn--block', loading && 'g-btn--loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="g-btn-spinner" aria-hidden="true" />}
      <span className="g-btn-label">{children}</span>
    </button>
  ),
)
Button.displayName = 'GlassButton'
