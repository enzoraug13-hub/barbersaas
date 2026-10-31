import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import { DUR, EASE } from './tokens'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface CountUpProps {
  value: number
  /** Formatação a cada frame — o último frame usa exatamente esta função com o valor final. Padrão: BRL. */
  format?: (n: number) => string
  /** Duração em segundos (padrão ~1s). */
  duration?: number
  className?: string
  style?: CSSProperties
}

/**
 * Número que conta de 0 até `value` (≈1s) quando entra na tela. Se `value`
 * muda depois (ex.: troca de período), anima do valor atual até o novo.
 * Escreve direto no DOM (sem re-render por frame). Leitores de tela recebem
 * só o valor final.
 */
export function CountUp({ value, format = brl, duration = DUR.count, className = '', style }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const fmt = useRef(format)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true })
  const target = Number.isFinite(value) ? value : 0

  useLayoutEffect(() => { fmt.current = format })

  // Primeiro paint: mostra o ponto de partida (0) — ou o final, sem animação.
  useLayoutEffect(() => {
    if (ref.current && !ref.current.textContent) ref.current.textContent = fmt.current(reduce ? target : 0)
  }, [reduce, target])

  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (reduce) {
      shown.current = target
      el.textContent = fmt.current(target)
      return
    }
    const controls = animate(shown.current, target, {
      duration,
      ease: EASE,
      onUpdate: v => { shown.current = v; el.textContent = fmt.current(v) },
      onComplete: () => { shown.current = target; el.textContent = fmt.current(target) },
    })
    return () => controls.stop()
  }, [target, inView, reduce, duration])

  return (
    <span className={`g-num ${className}`} style={style}>
      <span ref={ref} aria-hidden="true" />
      <span className="sr-only">{format(target)}</span>
    </span>
  )
}
