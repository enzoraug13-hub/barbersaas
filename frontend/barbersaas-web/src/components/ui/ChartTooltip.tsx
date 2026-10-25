import type { TooltipSeries } from './chartTheme'

type TooltipProps = {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; name?: string; value?: number }>
  label?: string | number
  series: TooltipSeries
  labelFmt?: (label: string | number) => string
}

/* Tooltip dos gráficos: superfície branca, rótulo do período e um valor por série. */
export function ChartTooltip({ active, payload, label, series, labelFmt }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-line rounded-[8px] px-3 py-2.5" style={{ boxShadow: 'var(--shadow-pop)', minWidth: 150 }}>
      <p className="text-xs text-ink-2 mb-1.5">{labelFmt ? labelFmt(label ?? '') : String(label ?? '')}</p>
      {payload.map((p, i) => {
        const cfg = series[String(p.dataKey)]
        if (!cfg) return null
        return (
          <div key={i} className="flex items-center gap-2 text-13 mt-1 first:mt-0">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: cfg.color }} />
            <span className="text-ink-2">{cfg.label}</span>
            <span className="ml-auto pl-3 font-semibold text-ink t-num">{cfg.fmt(Number(p.value ?? 0))}</span>
          </div>
        )
      })}
    </div>
  )
}
