import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

/**
 * Campo numérico sem "0" fantasma. O form continua guardando número (0 = vazio),
 * mas o texto exibido é controlado à parte: começa vazio (placeholder "0") e a
 * digitação substitui normalmente — nada de "22" virar "022".
 *
 * Enquanto focado, mostra exatamente o que o usuário digitou; fora de foco,
 * espelha o número do form (0 vira vazio). Isso mantém resets externos
 * (abrir modal de edição, limpar form) funcionando sem efeito de sincronização.
 */
export function NumberField({ value, onChange, className = '', placeholder = '0', ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  const shown = focused ? text : (value ? String(value) : '')

  return (
    <input
      type="number"
      inputMode="decimal"
      className={`ds-input ${className}`}
      value={shown}
      placeholder={placeholder}
      onFocus={() => { setText(value ? String(value) : ''); setFocused(true) }}
      onBlur={() => setFocused(false)}
      onChange={e => {
        const t = e.target.value
        setText(t)
        const n = parseFloat(t)
        onChange(Number.isNaN(n) ? 0 : n)
      }}
      {...rest}
    />
  )
}
