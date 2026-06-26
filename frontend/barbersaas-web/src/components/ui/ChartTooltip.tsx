import type { TooltipSeries } from './chartTheme'

// Tooltip escuro elevado e legível: fundo var(--bg-elevated), borda sutil, rótulo
// claro e o accent apenas no número. Substitui o tooltip padrão do Recharts (que
// colore o texto com o fill da série e fica ilegível).
type TooltipProps = {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; name?: string; value?: number }>
  label?: string | number
  series: TooltipSeries
  labelFmt?: (label: string | number) => string
}

export function ChartTooltip({ active, payload, label, series, labelFmt }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '9px 11px',
      fontFamily: 'var(--font-ui)', minWidth: 130 }}>
      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 6 }}>
        {labelFmt ? labelFmt(label ?? '') : String(label ?? '')}
      </div>
      {payload.map((p, i) => {
        const cfg = series[String(p.dataKey)]
        if (!cfg) return null
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i === 0 ? 0 : 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{cfg.label}</span>
            <span style={{ marginLeft: 'auto', color: cfg.color, fontWeight: 700,
              fontSize: 'var(--text-xs)', fontVariantNumeric: 'tabular-nums' }}>
              {cfg.fmt(Number(p.value ?? 0))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
