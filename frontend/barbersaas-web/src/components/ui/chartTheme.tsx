import { Cell } from 'recharts'

// Acabamento dos gráficos: a série principal na cor da barbearia, a de
// comparação em cinza; em barras de um só tipo, cinza com destaque (ex.: hoje).
// Helpers e constantes ficam aqui (sem componentes React exportados junto com
// o tooltip, p/ não quebrar o fast-refresh).

export const chartAxisTick = { fill: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font)' }
export const chartGridStroke = 'var(--chart-grid)'
export const chartBarCursor = { fill: 'var(--surface-3)' }
export const CHART_MAIN = 'var(--chart-1)'
export const CHART_SECOND = 'var(--chart-2)'
export const CHART_ACCENT = 'var(--accent)'

/** Pinta as barras: destaque (ex.: hoje) na cor da barbearia, o resto em cinza. */
export function barFills(data: readonly unknown[], isHighlight: (row: unknown, i: number) => boolean,
  base = CHART_SECOND, highlight = CHART_ACCENT) {
  return data.map((row, i) => <Cell key={i} fill={isHighlight(row, i) ? highlight : base} />)
}

export type TooltipSeries = Record<string, { label: string; color: string; fmt: (v: number) => string }>
