import { useId, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DUR, EASE } from '../../motion/tokens'

export interface DonutSegment {
  value: number
  color: string
  label?: string
}

interface DonutProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  /** Espaço entre segmentos, em graus. */
  gap?: number
  /** Conteúdo no centro (ex.: total com <CountUp>). */
  children?: ReactNode
  /** Mude para redesenhar (ex.: período/filtro trocado). */
  replayKey?: string | number
  className?: string
}

/**
 * Donut em SVG puro que se desenha em sentido horário a partir do topo
 * (máscara com stroke-dashoffset animado — só pintura, sem layout).
 */
export function Donut({ segments, size = 148, thickness = 14, gap = 2, children, replayKey, className }: DonutProps) {
  const reduce = useReducedMotion()
  const maskId = `g-donut-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0)
  const visible = segments.filter(s => s.value > 0)
  const gapLen = visible.length > 1 ? (gap / 360) * c : 0

  let acc = 0
  const arcs = total > 0 ? visible.map(s => {
    const len = (s.value / total) * c
    const arc = { color: s.color, dash: Math.max(0, len - gapLen), offset: -acc }
    acc += len
    return arc
  }) : []

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }} aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <motion.circle
              key={replayKey}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="#fff" strokeWidth={thickness + 2}
              strokeDasharray={c}
              initial={{ strokeDashoffset: reduce ? 0 : c, opacity: reduce ? 0 : 1 }}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={reduce ? { duration: DUR.reduced } : { duration: DUR.chart, ease: EASE }}
            />
          </mask>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        <g mask={`url(#${maskId})`}>
          {arcs.map((a, i) => (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={a.color} strokeWidth={thickness} strokeLinecap="butt"
              strokeDasharray={`${a.dash} ${c}`} strokeDashoffset={a.offset} />
          ))}
        </g>
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: thickness, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {children}
        </div>
      )}
    </div>
  )
}
