import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

interface FieldShellProps {
  id: string
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

/** Label + campo + dica/erro, com ids ligados por aria-describedby. */
export function Field({ id, label, hint, error, children }: FieldShellProps) {
  return (
    <div className="g-field">
      {label && <label htmlFor={id} className="g-label">{label}</label>}
      {children}
      {error ? <span id={`${id}-msg`} className="g-error">{error}</span>
        : hint ? <span id={`${id}-msg`} className="g-hint">{hint}</span> : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  /** Ícone à esquerda (ex.: <Search size={16} />). */
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, id, className, ...rest }, ref) => {
    const auto = useId()
    const inputId = id ?? rest.name ?? auto
    return (
      <Field id={inputId} label={label} hint={hint} error={error}>
        <div className="g-input-wrap">
          {icon && <span className="g-input-icon" aria-hidden="true">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cx('g-input', !!icon && 'g-input--with-icon', !!error && 'g-input--invalid', className)}
            aria-invalid={!!error || undefined}
            aria-describedby={error || hint ? `${inputId}-msg` : undefined}
            {...rest}
          />
        </div>
      </Field>
    )
  },
)
Input.displayName = 'GlassInput'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className, ...rest }, ref) => {
    const auto = useId()
    const inputId = id ?? rest.name ?? auto
    return (
      <Field id={inputId} label={label} hint={hint} error={error}>
        <textarea
          ref={ref}
          id={inputId}
          className={cx('g-input', !!error && 'g-input--invalid', className)}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${inputId}-msg` : undefined}
          {...rest}
        />
      </Field>
    )
  },
)
Textarea.displayName = 'GlassTextarea'
