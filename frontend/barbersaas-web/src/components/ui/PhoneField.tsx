import { useId } from 'react'
import { maskBRPhone, onlyDigits } from '../../lib/masks'
import { Field } from './Input'
import { COUNTRIES } from '../../lib/phone'

interface PhoneFieldProps {
  label: string
  /** Dígitos do número, sem o código do país. */
  value: string
  onChange: (digits: string) => void
  error?: string
  hint?: string
  optional?: boolean
  autoFocus?: boolean
  required?: boolean
  onEnter?: () => void
}

export function PhoneField({ label, value, onChange, error, hint, optional, autoFocus, required, onEnter }: PhoneFieldProps) {
  const id = useId()
  const country = COUNTRIES[0]
  return (
    <Field label={label} optional={optional} error={error} hint={hint} htmlFor={id}>
      <div className="ds-affix">
        <span className="ds-affix-pre" title={country.label}>{country.dial}</span>
        <input
          id={id}
          className="ds-input"
          aria-invalid={error ? true : undefined}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(11) 99999-9999"
          value={maskBRPhone(value)}
          onChange={e => onChange(onlyDigits(e.target.value).slice(0, 11))}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          autoFocus={autoFocus}
          required={required}
        />
      </div>
    </Field>
  )
}
