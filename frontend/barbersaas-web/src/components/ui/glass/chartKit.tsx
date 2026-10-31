import { Cell, Rectangle, type BarShapeProps } from 'recharts'

// Acabamento dos gráficos no estilo glass. Helpers (não componentes) ficam
// aqui; componentes (GlassTooltip, Donut) em arquivos próprios por causa do
// fast-refresh. Série principal = var(--accent); secundárias = neutras.

export const gAxisTick = { fill: 'var(--g-chart-axis)', fontSize: 11, fontFamily: 'var(--g-font)' }
export const gGridStroke = 'var(--g-chart-grid)'
export const gBarCursor = { fill: 'rgba(255,255,255,0.04)' }
export const gLineCursor = { stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1, strokeDasharray: '3 3' }

/** Duração/curva dos gráficos com animação nativa do Recharts (linha/área). */
export const gChartAnim = { animationDuration: 900, animationEasing: 'ease-out' as const }

/** Gradiente vertical da barra: accent cheio embaixo, levemente translúcido no topo. */
export function gBarGradient(id: string, color = 'var(--accent)') {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={1} />
      <stop offset="100%" stopColor={color} stopOpacity={0.55} />
    </linearGradient>
  )
}

/** Preenchimento de área (some em direção ao eixo). */
export function gAreaGradient(id: string, color = 'var(--accent)', top = 0.3) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={top} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

/** Hierarquia: a maior barra em opacidade cheia, as demais mais discretas. */
export function gBarCells(data: readonly unknown[], key: string) {
  const vals = data.map(d => Number((d as Record<string, unknown>)?.[key]) || 0)
  const max = Math.max(0, ...vals)
  return data.map((_, i) => <Cell key={i} fillOpacity={max > 0 && vals[i] === max ? 1 : 0.5} />)
}

/**
 * Shape de <Bar> que cresce de baixo pra cima (scaleY, só transform) com
 * stagger por índice. Use com isAnimationActive={false} no <Bar> e troque a
 * `key` do gráfico pra redisparar (ex.: ao mudar período/filtro).
 */
export function growBarShape(staggerMs = 60) {
  return function GrowBar(props: BarShapeProps) {
    const negative = (typeof props.value === 'number' && props.value < 0) || props.height < 0
    return (
      <g className={negative ? 'g-bar-grow g-bar-grow--neg' : 'g-bar-grow'}
        style={{ animationDelay: `${(props.index ?? 0) * staggerMs}ms` }}>
        <Rectangle {...props} />
      </g>
    )
  }
}
