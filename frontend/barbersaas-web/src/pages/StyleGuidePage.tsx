import { useState } from 'react'
import { Sun, Moon, Check, Loader2, Scissors, Search, Calendar, Star } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

/* Style guide vivo (Fase 3.1) — renderiza os tokens e componentes base p/ validar
   a direção visual em light e dark. Rota: /style-guide */

const swatches: { name: string; var: string; fg?: string }[] = [
  { name: 'app', var: '--bg' }, { name: 'surface', var: '--surface' },
  { name: 'surfaceHover', var: '--surface-hover' }, { name: 'border', var: '--border' },
  { name: 'accent', var: '--accent', fg: '--accent-fg' }, { name: 'success', var: '--success' },
  { name: 'warning', var: '--warning' }, { name: 'danger', var: '--danger' }, { name: 'info', var: '--info' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">{title}</h2>
      {children}
    </section>
  )
}

export default function StyleGuidePage() {
  const { theme, toggle } = useThemeStore()
  const [loading] = useState(true)

  return (
    <div className="min-h-screen bg-app text-content">
      <div className="max-w-4xl mx-auto px-5 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-accent text-sm font-semibold">Trimly</p>
            <h1 className="text-3xl font-bold tracking-tight">Design System</h1>
            <p className="text-muted mt-1">Dark-first premium · tokens · {theme}</p>
          </div>
          <button onClick={toggle} className="btn-secondary">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>

        {/* Cores */}
        <Section title="Cores">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {swatches.map(s => (
              <div key={s.name} className="rounded-xl border border-border overflow-hidden">
                <div className="h-16 flex items-center justify-center text-xs font-medium"
                  style={{ background: `rgb(var(${s.var}))`, color: s.fg ? `rgb(var(${s.fg}))` : 'rgb(var(--text))' }}>
                  {s.fg ? 'Aa' : ''}
                </div>
                <div className="px-2 py-1.5 text-xs text-muted bg-surface">{s.name}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Tipografia */}
        <Section title="Tipografia">
          <div className="card space-y-2">
            <p className="text-4xl font-extrabold tracking-tight">Corte premium</p>
            <p className="text-2xl font-bold tracking-tight">Título de página</p>
            <p className="text-lg font-semibold">Subtítulo de seção</p>
            <p className="text-sm text-content">Corpo de texto — o padrão para a maior parte da interface.</p>
            <p className="text-sm text-muted">Texto secundário (muted).</p>
            <p className="text-xs text-subtle">Texto terciário / legendas (subtle).</p>
          </div>
        </Section>

        {/* Botões */}
        <Section title="Botões">
          <div className="card flex flex-wrap items-center gap-3">
            <button className="btn-primary"><Check size={16} /> Primary</button>
            <button className="btn-secondary"><Scissors size={16} /> Secondary</button>
            <button className="btn-ghost">Ghost</button>
            <button className="btn-danger">Danger</button>
            <button className="btn-primary" disabled><Loader2 size={16} className="animate-spin" /> Loading</button>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div className="card grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Campo de texto</label>
              <input className="input" placeholder="Digite algo…" />
            </div>
            <div>
              <label className="label">Com ícone</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                <input className="input pl-10" placeholder="Buscar…" />
              </div>
            </div>
          </div>
        </Section>

        {/* Cards + badges */}
        <Section title="Cards e badges de status">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card card-tap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">JS</div>
                <div><p className="font-semibold">João Silva</p><p className="text-sm text-muted">Corte + barba · 14:00</p></div>
                <div className="ml-auto flex items-center gap-1 text-accent font-bold"><Star size={14} /> 120</div>
              </div>
            </div>
            <div className="card space-y-2">
              <span className="badge-pending">Pendente</span>{' '}
              <span className="badge-confirmed">Confirmado</span>{' '}
              <span className="badge-completed">Concluído</span>{' '}
              <span className="badge-cancelled">Cancelado</span>
            </div>
          </div>
        </Section>

        {/* Estados */}
        <Section title="Estados — loading e vazio">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2.5">
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
            <div className="card text-center py-8">
              <Calendar size={32} className="mx-auto text-subtle mb-2" />
              <p className="text-muted text-sm">Nenhum agendamento ainda.</p>
            </div>
          </div>
          {loading && <p className="text-xs text-subtle">Skeleton com shimmer ativo (respeita prefers-reduced-motion).</p>}
        </Section>
      </div>
    </div>
  )
}
