import type { HTMLAttributes, ReactNode } from 'react'

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'accent'

/* Etiqueta de status: ponto + texto sobre fundo suave do tom. */
export function Pill({ tone = 'neutral', plain, children, className = '', ...rest }: {
  tone?: Tone; plain?: boolean; children: ReactNode
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`ds-pill ds-pill-${tone} ${plain ? 'ds-pill-plain' : ''} ${className}`} {...rest}>
      {children}
    </span>
  )
}
