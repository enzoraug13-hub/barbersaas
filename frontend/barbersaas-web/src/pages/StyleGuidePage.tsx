import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Logo, LogoMark, Wordmark } from '../components/ui/Logo'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Pill } from '../components/ui/Badge'
import { Panel } from '../components/ui/Panel'
import { Ledger } from '../components/ui/Ledger'
import { Avatar } from '../components/ui/Avatar'
import { Segmented, Switch, Tabs } from '../components/ui/Controls'
import { EmptyState } from '../components/ui/EmptyState'
import { ListSkeleton } from '../components/ui/Skeleton'
import { resetTenantTheme } from '../lib/theme-tenant'

/* Referência viva do design system (rota /style-guide): tokens e componentes
   reais do app, na cor padrão do Trimly. */

const colors: { group: string; items: { name: string; v: string }[] }[] = [
  { group: 'Marca', items: [{ name: 'brand', v: '--brand' }, { name: 'brand-dark', v: '--brand-dark' }, { name: 'brand-aqua', v: '--brand-aqua' }] },
  { group: 'Superfícies', items: [{ name: 'canvas', v: '--canvas' }, { name: 'surface', v: '--surface' }, { name: 'surface-2', v: '--surface-2' }, { name: 'surface-3', v: '--surface-3' }] },
  { group: 'Linhas e texto', items: [{ name: 'line', v: '--line' }, { name: 'line-strong', v: '--line-strong' }, { name: 'ink', v: '--ink' }, { name: 'ink-2', v: '--ink-2' }, { name: 'ink-3', v: '--ink-3' }] },
  { group: 'Estados', items: [{ name: 'ok', v: '--ok-solid' }, { name: 'warn', v: '--warn-solid' }, { name: 'bad', v: '--bad-solid' }, { name: 'info', v: '--info-solid' }] },
]

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-md font-semibold">{title}</h2>
        {note && <p className="text-13 text-ink-2 mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  )
}

export default function StyleGuidePage() {
  const [seg, setSeg] = useState<'dia' | 'semana'>('dia')
  const [tab, setTab] = useState<'a' | 'b'>('a')
  const [on, setOn] = useState(true)

  useEffect(() => { resetTenantTheme(); document.title = 'Design system | Trimly' }, [])

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-line">
        <div className="max-w-[1080px] mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size={28} />
          <span className="text-13 text-ink-2">Design system</span>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-5 py-10 space-y-12">
        <Section title="Marca" note="O símbolo é um t com o corte da navalha. Sobre fundo escuro, a versão invertida.">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="ds-panel ds-panel-pad flex items-center justify-center h-32"><Logo size={36} /></div>
            <div className="rounded-panel flex items-center justify-center h-32" style={{ background: 'var(--brand)' }}><Logo size={36} inverse /></div>
            <div className="ds-panel ds-panel-pad flex items-center justify-center gap-6 h-32"><LogoMark size={48} /><LogoMark size={32} /><Wordmark height={18} /></div>
          </div>
        </Section>

        <Section title="Cores" note="Toda tela usa estes tokens. A cor da barbearia substitui o accent em tempo de execução.">
          <div className="space-y-5">
            {colors.map(g => (
              <div key={g.group}>
                <p className="text-13 text-ink-2 mb-2">{g.group}</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {g.items.map(c => (
                    <div key={c.name} className="ds-panel overflow-hidden">
                      <div className="h-14 border-b border-line" style={{ background: `var(${c.v})` }} />
                      <p className="px-3 py-2 text-13 font-medium">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Tipografia" note="Archivo variável. Títulos e números em largura condensada; corpo em largura normal.">
          <div className="ds-panel ds-panel-pad space-y-3">
            <p className="t-display text-[40px] leading-[44px]">Barbearia Vila Nova</p>
            <p className="ds-page-title">Título de página</p>
            <p className="text-md font-semibold">Título de seção</p>
            <p className="text-sm">Texto de interface, 14 px. É o tamanho da maior parte do painel.</p>
            <p className="text-sm text-ink-2">Texto de apoio, para descrições e linhas secundárias.</p>
            <p className="t-num text-[28px] font-semibold" style={{ fontStretch: 'var(--stretch-numeric)' }}>R$ 18.640,00</p>
          </div>
        </Section>

        <Section title="Ações">
          <div className="ds-panel ds-panel-pad flex flex-wrap items-center gap-3">
            <Button><Plus size={16} /> Novo agendamento</Button>
            <Button variant="secondary">Editar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger">Excluir</Button>
            <Button variant="danger-ghost">Bloquear cliente</Button>
            <Button loading>Salvando</Button>
            <Button size="sm" variant="secondary">Pequeno</Button>
          </div>
        </Section>

        <Section title="Formulários">
          <div className="ds-panel ds-panel-pad grid sm:grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Nome do cliente" />
            <Input label="Buscar" placeholder="Nome ou telefone" leading={<Search size={16} />} />
            <Select label="Profissional"><option>Caio Martins</option><option>Rafael Souza</option></Select>
            <Input label="E-mail" optional error="Confira o e-mail." defaultValue="caio@" />
            <div className="flex items-center gap-6 flex-wrap sm:col-span-2">
              <Segmented value={seg} onChange={setSeg} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }]} />
              <Switch checked={on} onChange={setOn} label="Exemplo" />
            </div>
            <div className="sm:col-span-2">
              <Tabs value={tab} onChange={setTab} options={[{ value: 'a', label: 'Produtos' }, { value: 'b', label: 'Categorias', badge: 3 }]} />
            </div>
          </div>
        </Section>

        <Section title="Status">
          <div className="ds-panel ds-panel-pad flex flex-wrap gap-2">
            <Pill tone="warn">Pendente</Pill>
            <Pill tone="info">Confirmado</Pill>
            <Pill tone="ok">Concluído</Pill>
            <Pill tone="neutral">Cancelado</Pill>
            <Pill tone="bad">Faltou</Pill>
            <Pill tone="accent">Todas as barbearias</Pill>
          </div>
        </Section>

        <Section title="Números" note="Indicadores lado a lado numa régua só, como um fechamento de caixa.">
          <Ledger items={[
            { label: 'Receita do mês', value: 'R$ 18.640,00', delta: { pct: 12.4 } },
            { label: 'Atendimentos', value: '342', delta: { pct: 4.1 } },
            { label: 'Despesas', value: 'R$ 6.210,00', delta: { pct: 8.2, goodWhenUp: false } },
          ]} />
        </Section>

        <Section title="Listas e estados">
          <div className="grid lg:grid-cols-3 gap-4">
            <Panel pad={false}>
              <ul className="ds-list">
                {['Caio Martins', 'Rafael Souza', 'Bruno Lima'].map((n, i) => (
                  <li key={n} className="ds-row">
                    <Avatar name={n} size={32} />
                    <div className="ds-row-main"><p className="ds-row-title">{n}</p><p className="ds-row-sub t-num">{['09:00', '10:30', '14:00'][i]}, corte</p></div>
                  </li>
                ))}
              </ul>
            </Panel>
            <ListSkeleton rows={3} />
            <EmptyState boxed icon={Search} title="Nenhum cliente encontrado" hint="Confira a grafia ou busque pelo telefone." />
          </div>
          <div className="ds-notice ds-notice-warn"><span>Aviso em linha: 2 produtos com estoque baixo.</span></div>
        </Section>
      </main>
    </div>
  )
}
