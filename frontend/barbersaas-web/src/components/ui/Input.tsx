import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const inputId = id ?? rest.name
    return (
      <div className="ds-field">
        {label && <label htmlFor={inputId} className="ds-label">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`ds-input ${error ? 'ds-input-error' : ''} ${className}`}
          aria-invalid={!!error}
          {...rest}
        />
        {error && <span className="ds-error-text">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
