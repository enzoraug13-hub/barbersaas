import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity, type MotionValue,
} from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ICON } from './navConfig'

export interface LiquidTab {
  key: string
  label: string
  icon: LucideIcon
  /** Pontinho de "tem novidade" no ícone. */
  badge?: boolean
  /** 'route' navega (a lente fica nele); 'action' abre algo (ex.: "Mais") e a lente volta pro ativo. */
  kind?: 'route' | 'action'
}

interface Props {
  items: LiquidTab[]
  activeIndex: number
  onSelect: (index: number) => void
  className?: string
  'aria-label'?: string
}

const PAD = 4          // respiro entre a borda da cápsula e a lente
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/**
 * Tab bar "Liquid Glass" (estilo iOS 26): cápsula de vidro flutuante com uma
 * lente clara atrás do item ativo. A lente desliza com mola e estica na
 * direção do movimento (gelatina); ao encostar o dedo ela cresce e amplia o
 * ícone embaixo; dá pra arrastar o dedo pela barra e soltar no item. Tudo por
 * transform/opacity.
 */
export function LiquidTabBar({ items, activeIndex, onSelect, className, ...aria }: Props) {
  const reduce = !!useReducedMotion()
  const barRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const n = items.length
  const itemW = width ? (width - PAD * 2) / n : 0
  const slot = (i: number) => PAD + i * itemW

  // Posição da lente: alvo (x) → mola (sx). A velocidade da mola vira o esticão.
  const x = useMotionValue(0)
  const sx = useSpring(x, reduce ? { stiffness: 2000, damping: 100 } : { stiffness: 520, damping: 34, mass: 0.85 })
  const vel = useVelocity(sx)
  const stretchX = useTransform(vel, [-2600, 0, 2600], [1.3, 1, 1.3], { clamp: true })
  const stretchY = useTransform(vel, [-2600, 0, 2600], [0.84, 1, 0.84], { clamp: true })
  // Dedo encostado: a lente "levanta" (cresce e clareia).
  const pressTarget = useMotionValue(0)
  const press = useSpring(pressTarget, { stiffness: 620, damping: 32 })
  const scaleX = useTransform<number, number>([stretchX, press], ([s, p]) => (reduce ? 1 : s) * (1 + (reduce ? 0 : 0.16) * p))
  const scaleY = useTransform<number, number>([stretchY, press], ([s, p]) => (reduce ? 1 : s) * (1 + (reduce ? 0 : 0.24) * p))

  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Acompanha a rota (fora do arrasto). Na primeira medição, posiciona sem animar.
  const dragging = useRef(false)
  const placed = useRef(false)
  useEffect(() => {
    if (!itemW || dragging.current) return
    const t = slot(activeIndex)
    if (!placed.current) { x.set(t); sx.jump(t); placed.current = true }
    else x.set(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, itemW])

  // Arrasto / toque
  const gesture = useRef<{ id: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const indexAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    return clamp(Math.floor((clientX - r.left - PAD) / itemW), 0, n - 1)
  }
  const follow = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect()
    x.set(clamp(clientX - r.left - itemW / 2, PAD, slot(n - 1)))
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!itemW || (e.pointerType === 'mouse' && e.button !== 0)) return
    gesture.current = { id: e.pointerId }
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    pressTarget.set(1)
    follow(e.clientX)
    setHover(indexAt(e.clientX))
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== e.pointerId) return
    follow(e.clientX)
    const i = indexAt(e.clientX)
    if (i !== hover) setHover(i)
  }
  const finish = (e: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    if (gesture.current?.id !== e.pointerId) return
    gesture.current = null
    dragging.current = false
    pressTarget.set(0)
    setHover(null)
    const i = indexAt(e.clientX)
    const stays = commit && (items[i]?.kind ?? 'route') === 'route'
    x.set(slot(stays ? i : activeIndex))
    if (commit) onSelect(i)
  }

  return (
    <div
      ref={barRef}
      role="tablist"
      className={`g-lg-bar ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={e => finish(e, true)}
      onPointerCancel={e => finish(e, false)}
      {...aria}
    >
      {itemW > 0 && (
        <motion.div className="g-lg-lens" aria-hidden="true" style={{ x: sx, width: itemW, scaleX, scaleY }}>
          <motion.span className="g-lg-lens-lift" style={{ opacity: press }} />
        </motion.div>
      )}
      {items.map((it, i) => (
        <LiquidTabButton key={it.key} tab={it} index={i} itemW={itemW} lensX={sx} press={press} reduce={reduce}
          selected={i === activeIndex}
          tinted={hover !== null ? hover === i : i === activeIndex}
          onKeyboardSelect={() => onSelect(i)} />
      ))}
    </div>
  )
}

function LiquidTabButton({ tab, index, itemW, lensX, press, reduce, selected, tinted, onKeyboardSelect }: {
  tab: LiquidTab; index: number; itemW: number; lensX: MotionValue<number>; press: MotionValue<number>; reduce: boolean
  selected: boolean; tinted: boolean; onKeyboardSelect: () => void
}) {
  // Lente por cima amplia o ícone (só enquanto o dedo está encostado).
  const scale = useTransform<number, number>([lensX, press], ([lx, p]) => {
    if (reduce || !itemW) return 1
    const d = Math.abs(lx + itemW / 2 - (PAD + index * itemW + itemW / 2)) / itemW
    return 1 + 0.16 * p * Math.max(0, 1 - d)
  })
  const Icon = tab.icon
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-current={selected ? 'page' : undefined}
      className="g-lg-item"
      data-tinted={tinted}
      // Toque/mouse são tratados na barra (lente + arrasto); aqui só teclado (detail === 0).
      onClick={e => { if (e.detail === 0) onKeyboardSelect() }}
    >
      <motion.span className="g-lg-item-inner" style={{ scale }}>
        <span className="g-bn-icon"><Icon {...ICON} size={24} />{tab.badge && <span className="g-side-icon-badge" aria-hidden="true" />}</span>
        <span className="g-lg-label">{tab.label}</span>
      </motion.span>
    </button>
  )
}
