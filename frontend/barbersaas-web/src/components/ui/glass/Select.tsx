import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field } from './Input'
import { cx } from './cx'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

/**
 * <select> nativo vestido de vidro — mantém teclado, leitor de tela e o
 * seletor nativo do celular (melhor UX no mobile que um dropdown custom).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, className, children, ...rest }, ref) => {
    const auto = useId()
    const selectId = id ?? rest.name ?? auto
    return (
      <Field id={selectId} label={label} hint={hint} error={error}>
        <div className="g-input-wrap">
          <select
            ref={ref}
            id={selectId}
            className={cx('g-input', 'g-select', !!error && 'g-input--invalid', className)}
            aria-invalid={!!error || undefined}
            aria-describedby={error || hint ? `${selectId}-msg` : undefined}
            {...rest}
          >
            {children}
          </select>
          <span className="g-select-chevron" aria-hidden="true"><ChevronDown size={16} /></span>
        </div>
      </Field>
    )
  },
)
Select.displayName = 'GlassSelect'
