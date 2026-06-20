import { maskBRPhone, onlyDigits } from '../../lib/masks'

// Só Brasil por ora. Pra adicionar outro país: incluir aqui (dial code,
// bandeira, máscara/validação próprias) — o seletor já existe pra isso.
export const COUNTRIES = [
  { code: 'BR', dial: '+55', flag: '🇧🇷', label: 'Brasil' },
] as const

interface PhoneFieldProps {
  label: string
  /** Dígitos do número, sem o código do país. */
  value: string
  onChange: (digits: string) => void
  error?: string
  autoFocus?: boolean
  onEnter?: () => void
}

export function PhoneField({ label, value, onChange, error, autoFocus, onEnter }: PhoneFieldProps) {
  const country = COUNTRIES[0]

  return (
    <div className="ds-field">
      <label className="ds-label">{label}</label>
      <div className="ds-phone-group">
        <div className="ds-phone-prefix">
          <select value={country.code} disabled aria-label="País" title="Por ora, só Brasil">
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>)}
          </select>
        </div>
        <input
          className={`ds-input flex-1 ${error ? 'ds-input-error' : ''}`}
          type="tel"
          inputMode="numeric"
          placeholder="(11) 99999-9999"
          value={maskBRPhone(value)}
          onChange={e => onChange(onlyDigits(e.target.value).slice(0, 11))}
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
          autoFocus={autoFocus}
        />
      </div>
      {error && <span className="ds-error-text">{error}</span>}
    </div>
  )
}
