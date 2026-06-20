import { useRef, useEffect } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  error?: boolean
}

export function OtpInput({ length = 6, value, onChange, onComplete, error }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  useEffect(() => { refs.current[0]?.focus() }, [])

  const setDigit = (i: number, d: string) => {
    const next = digits.slice()
    next[i] = d
    const joined = next.join('')
    onChange(joined)
    if (d && i < length - 1) refs.current[i + 1]?.focus()
    if (joined.length === length && !joined.includes('')) onComplete?.(joined)
  }

  const handleChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '')
    if (d.length > 1) {
      // colar várias casas de uma vez
      const pasted = d.slice(0, length - i).split('')
      const next = digits.slice()
      pasted.forEach((c, j) => { next[i + j] = c })
      const joined = next.join('')
      onChange(joined)
      const last = Math.min(i + pasted.length, length - 1)
      refs.current[last]?.focus()
      if (joined.length === length && !joined.includes('')) onComplete?.(joined)
      return
    }
    setDigit(i, d)
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          className="ds-input text-center font-semibold"
          style={{
            width: 44, height: 52, fontSize: 'var(--text-xl)', padding: 0,
            borderColor: error ? 'var(--color-error)' : undefined,
          }}
          inputMode="numeric"
          maxLength={length}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
