import { useId } from 'react'
import { TRIMLY_T } from './trimlyMarkPaths'

// Marca do Trimly: "T de corte" — barra inclinada, haste afinando em lâmina e
// um corte diagonal atravessando a letra (o "trim"). Dourado sobre ladrilho
// escuro com aro dourado. Mesmo desenho do favicon e dos ícones do app.

export function TrimlyMark({ size = 36, className, title }: { size?: number; className?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`g-trimly-mark ${className ?? ''}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F4DC97" /><stop offset=".5" stopColor="#C9A84C" /><stop offset="1" stopColor="#8E6C27" />
        </linearGradient>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#231D15" /><stop offset="1" stopColor="#0B0907" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E9CF86" stopOpacity=".75" /><stop offset=".6" stopColor="#C9A84C" stopOpacity=".25" /><stop offset="1" stopColor="#C9A84C" stopOpacity=".55" />
        </linearGradient>
        <mask id={`${id}-cut`}>
          <rect width="48" height="48" fill="#fff" />
          <path d={TRIMLY_T.slice} stroke="#000" strokeWidth="2.1" />
        </mask>
      </defs>
      <rect x=".75" y=".75" width="46.5" height="46.5" rx="13" fill={`url(#${id}-tile)`} stroke={`url(#${id}-rim)`} strokeWidth="1.5" />
      <g mask={`url(#${id}-cut)`} fill={`url(#${id}-gold)`}>
        <path d={TRIMLY_T.bar} />
        <path d={TRIMLY_T.stem} />
      </g>
    </svg>
  )
}
