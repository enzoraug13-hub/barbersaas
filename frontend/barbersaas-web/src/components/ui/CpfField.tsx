import { useId } from 'react'
import { maskCPF, onlyDigits } from '../../lib/masks'
import { Field } from './Input'

interface CpfFieldProps {
  label: string
  /** Dígitos do CPF (sem pontuação). */
  value: string
  onChange: (digits: string) => void
  error?: string
  onEnter?: () => void
}

export function CpfField({ label, value, onChange, error, onEnter }: CpfFieldProps) {
  const id = useId()
  return (
    <Field label={label} error={error} htmlFor={id}>
      <input
        id={id}
        className="ds-input"
        aria-invalid={error ? true : undefined}
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={maskCPF(value)}
        onChange={e => onChange(onlyDigits(e.target.value).slice(0, 11))}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      />
    </Field>
  )
}
