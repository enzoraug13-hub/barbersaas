import { maskCPF, onlyDigits } from '../../lib/masks'

interface CpfFieldProps {
  label: string
  /** Dígitos do CPF (sem pontuação). */
  value: string
  onChange: (digits: string) => void
  error?: string
  onEnter?: () => void
}

export function CpfField({ label, value, onChange, error, onEnter }: CpfFieldProps) {
  return (
    <div className="ds-field">
      <label className="ds-label">{label}</label>
      <input
        className={`ds-input ${error ? 'ds-input-error' : ''}`}
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={maskCPF(value)}
        onChange={e => onChange(onlyDigits(e.target.value).slice(0, 11))}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      />
      {error && <span className="ds-error-text">{error}</span>}
    </div>
  )
}
