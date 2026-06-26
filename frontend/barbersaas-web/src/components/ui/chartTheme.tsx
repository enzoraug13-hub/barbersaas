import { Cell } from 'recharts'

// Acabamento compartilhado dos gráficos. Tudo derivado de var(--accent) (a cor
// da marca que o tenant escolhe em Aparência) e dos tokens — nada de hex fixo.
// Sem componentes React aqui de propósito: helpers/constantes ficam separados do
// componente <ChartTooltip> pra não quebrar o fast-refresh (react-refresh).

export const chartAxisTick = { fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }
export const chartGridStroke = 'var(--border-subtle)'
export const chartBarCursor = { fill: 'var(--accent)', fillOpacity: 0.08 }

// Gradiente vertical sutil do accent: mais sólido embaixo, levemente translúcido
// no topo — dá profundidade sem trocar a cor.
export function accentBarGradient(id: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.72} />
      <stop offset="100%" stopColor="var(--accent)" stopOpacity={1} />
    </linearGradient>
  )
}

// Hierarquia por opacidade: a barra de maior valor vem em accent cheio, as
// demais levemente translúcidas. Herdam o fill (gradiente) da <Bar>.
export function barCells(data: readonly unknown[], key: string) {
  const vals = data.map(d => Number((d as Record<string, unknown>)?.[key]) || 0)
  const max = Math.max(0, ...vals)
  return data.map((_, i) => (
    <Cell key={i} fillOpacity={max > 0 && vals[i] === max ? 1 : 0.62} />
  ))
}

export type TooltipSeries = Record<string, { label: string; color: string; fmt: (v: number) => string }>
