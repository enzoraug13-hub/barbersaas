import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface LedgerItem {
  label: string
  value: ReactNode
  /** Variação % vs. período anterior. `goodWhenUp=false` p/ despesas e cancelamentos. */
  delta?: { pct?: number; goodWhenUp?: boolean; vs?: string }
  foot?: ReactNode
  /** Cor do valor (ex.: lucro negativo). */
  tone?: 'bad'
}

/* Faixa de indicadores: uma régua única dividida em células — os números
   lado a lado, alinhados, como um fechamento de caixa. */
export function Ledger({ items }: { items: LedgerItem[] }) {
  const odd = items.length % 2 === 1
  return (
    <div className="ds-ledger" style={{ ['--cols' as string]: items.length }}>
      {items.map((it, i) => (
        <div key={it.label} className={`ds-ledger-cell ${odd && i === items.length - 1 ? 'ds-span-mobile' : ''}`}>
          <p className="ds-ledger-label">{it.label}</p>
          <p className="ds-ledger-value" style={it.tone === 'bad' ? { color: 'var(--bad)' } : undefined}>{it.value}</p>
          {(it.delta?.pct !== undefined || it.foot) && (
            <div className="ds-ledger-foot">
              {it.delta?.pct !== undefined && <Delta pct={it.delta.pct} goodWhenUp={it.delta.goodWhenUp ?? true} />}
              {it.delta?.pct !== undefined && <span>{it.delta.vs ?? 'vs. mês anterior'}</span>}
              {it.foot}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function Delta({ pct, goodWhenUp = true }: { pct: number; goodWhenUp?: boolean }) {
  const up = pct >= 0
  const good = up === goodWhenUp
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`ds-delta ${good ? 'ds-delta-good' : 'ds-delta-bad'}`}>
      <Icon size={13} strokeWidth={2.25} />
      {Math.abs(pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  )
}
