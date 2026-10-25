import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

/* Campo de formulário: rótulo + controle + dica/erro, sempre ligados por id
   (leitores de tela anunciam a dica e o erro junto do campo). */
export function Field({ label, optional, hint, error, htmlFor, children, className = '' }: {
  label?: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ds-field ${className}`}>
      {label && (
        <label className="ds-label" htmlFor={htmlFor}>
          {label}{optional && <span className="ds-label-opt"> (opcional)</span>}
        </label>
      )}
      {children}
      {error ? <span className="ds-error" role="alert">{error}</span> : hint ? <span className="ds-hint">{hint}</span> : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  /** Ícone à esquerda dentro do campo. */
  leading?: ReactNode
  /** Elemento à direita dentro do campo (ex.: botão mostrar senha). */
  trailing?: ReactNode
  fieldClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, optional, hint, error, leading, trailing, className = '', fieldClassName = '', id, ...rest }, ref) => {
    const auto = useId()
    const inputId = id ?? auto
    const control = (
      <input
        ref={ref}
        id={inputId}
        className={`ds-input ${className}`}
        aria-invalid={error ? true : undefined}
        style={trailing ? { paddingRight: 44 } : undefined}
        {...rest}
      />
    )
    return (
      <Field label={label} optional={optional} hint={hint} error={error} htmlFor={inputId} className={fieldClassName}>
        {leading || trailing ? (
          <div className="ds-input-wrap">
            {leading}
            {control}
            {trailing && <span className="ds-input-trailing">{trailing}</span>}
          </div>
        ) : control}
      </Field>
    )
  },
)
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  fieldClassName?: string
}

export function Select({ label, optional, hint, error, className = '', fieldClassName = '', id, children, ...rest }: SelectProps) {
  const auto = useId()
  const selectId = id ?? auto
  return (
    <Field label={label} optional={optional} hint={hint} error={error} htmlFor={selectId} className={fieldClassName}>
      <select id={selectId} className={`ds-input ${className}`} aria-invalid={error ? true : undefined} {...rest}>
        {children}
      </select>
    </Field>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  fieldClassName?: string
}

export function Textarea({ label, optional, hint, error, className = '', fieldClassName = '', id, ...rest }: TextareaProps) {
  const auto = useId()
  const areaId = id ?? auto
  return (
    <Field label={label} optional={optional} hint={hint} error={error} htmlFor={areaId} className={fieldClassName}>
      <textarea id={areaId} className={`ds-input ${className}`} aria-invalid={error ? true : undefined} {...rest} />
    </Field>
  )
}
