export type GlassTooltipSeries = Record<string, { label: string; color: string; fmt: (v: number) => string }>

type Props = {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; name?: string; value?: number }>
  label?: string | number
  series: GlassTooltipSeries
  labelFmt?: (label: string | number) => string
}

/** Tooltip de vidro para Recharts (content={<GlassTooltip series={…} />}). */
export function GlassTooltip({ active, payload, label, series, labelFmt }: Props) {
  if (!active || !payload?.length) return null
  return (
    <div className="g-chart-tooltip">
      <div style={{ color: 'var(--g-fg-1)', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
        {labelFmt ? labelFmt(label ?? '') : String(label ?? '')}
      </div>
      {payload.map((p, i) => {
        const cfg = series[String(p.dataKey)]
        if (!cfg) return null
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i === 0 ? 0 : 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: cfg.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--g-fg-2)', fontSize: 12 }}>{cfg.label}</span>
            <span className="g-num" style={{ marginLeft: 'auto', paddingLeft: 12, color: 'var(--g-fg-1)', fontWeight: 600, fontSize: 12 }}>
              {cfg.fmt(Number(p.value ?? 0))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
