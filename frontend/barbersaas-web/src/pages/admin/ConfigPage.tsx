import { useState, useEffect } from 'react'
import { Loader2, Save, Image as ImageIcon, Palette, Store, CalendarClock, Clock, Check, Scissors } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { applyTenantTheme } from '../../lib/theme-tenant'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ImageField } from '../../components/ui/ImageField'
import { PhoneField } from '../../components/ui/PhoneField'
import { brDigitsFromStored, toE164BR } from '../../lib/masks'
import toast from 'react-hot-toast'

interface BusinessHour { dayOfWeek: number; isOpen: boolean; openTime: string | null; closeTime: string | null }

interface SettingsForm {
  businessName?: string; description?: string
  phone?: string; whatsAppNumber?: string; instagramUrl?: string
  address?: string; city?: string; state?: string; zipCode?: string
  primaryColor?: string; secondaryColor?: string; accentColor?: string
  logoUrl?: string; coverImageUrl?: string
  slotIntervalMinutes?: number | string; maxAdvanceDays?: number | string
  allowOnlineBooking?: boolean; requireConfirmation?: boolean; customPriceEnabled?: boolean
  businessHours?: BusinessHour[]
}

const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

type Tab = 'aparencia' | 'fotos' | 'identidade' | 'agenda' | 'horarios'
const tabs = [
  { id: 'aparencia',  label: 'Aparência',  icon: Palette },
  { id: 'fotos',      label: 'Fotos',      icon: ImageIcon },
  { id: 'identidade', label: 'Identidade', icon: Store },
  { id: 'agenda',     label: 'Agenda',     icon: CalendarClock },
  { id: 'horarios',   label: 'Horários',   icon: Clock },
] as const

const toNum = (v: number | string | undefined): number | undefined =>
  v === '' || v === undefined || v === null ? undefined : Number(v)

// Texto legível (preto/branco) sobre uma cor — espelha o cálculo do tema.
function fgFor(hex?: string): string {
  const m = (hex ?? '').replace('#', '')
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#101012'
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) > 0.5 ? '#101012' : '#ffffff'
}

function SectionCard({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode
}) {
  return (
    <Card className="space-y-5" style={{ padding: 'var(--space-6)' }}>
      <div className="flex items-start gap-3 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="ds-icon-chip ds-icon-chip-accent flex-shrink-0" style={{ width: 36, height: 36 }}><Icon size={18} /></div>
        <div>
          <h3 className="ds-section-title">{title}</h3>
          {desc && <p className="ds-text-disabled mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{desc}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

/* ---------- Seletor de cor com legenda do efeito ---------- */
function ColorField({ label, hint, value, fallback, onChange }: {
  label: string; hint: string; value?: string; fallback: string; onChange: (v: string) => void
}) {
  const v = value || fallback
  return (
    <div className="flex items-center gap-3 ds-hoverable-field" style={{
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      background: 'var(--bg-base)',
      transition: 'border-color 180ms ease',
    }}>
      <input type="color" value={v} onChange={e => onChange(e.target.value)}
        className="cursor-pointer flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'transparent' }} aria-label={label} />
      <div className="min-w-0 flex-1">
        <p className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)' }}>{label}</p>
        <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{hint}</p>
      </div>
      <span className="ds-text-secondary uppercase flex-shrink-0" style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace' }}>{v}</span>
    </div>
  )
}

/* ---------- Prévia ao vivo (espelha a página pública + componentes) ---------- */
function ThemePreview({ brand, hero, logoUrl, name }: {
  brand: string; hero: string; logoUrl?: string; name?: string
}) {
  const fg = fgFor(brand)
  return (
    <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div className="h-24 flex flex-col items-center justify-center gap-1.5"
        style={{ background: `linear-gradient(to bottom, ${hero}, var(--bg-elevated))` }}>
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-10 h-10 object-cover" style={{ borderRadius: 'var(--radius-md)', border: `2px solid ${brand}80` }} />
          : <div className="w-10 h-10 flex items-center justify-center" style={{ borderRadius: 'var(--radius-md)', background: brand }}>
              <Scissors size={18} style={{ color: fg }} />
            </div>}
        <span className="font-bold drop-shadow" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{name || 'Sua Barbearia'}</span>
      </div>
      <div className="p-4 flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-subtle)' }}>
        <button type="button" className="inline-flex items-center gap-1.5 font-semibold"
          style={{ borderRadius: 'var(--radius-md)', padding: '8px var(--space-4)', fontSize: 'var(--text-sm)', background: brand, color: fg, border: 'none', cursor: 'default' }}>
          <Check size={14} /> Agendar
        </button>
        <span className="font-medium" style={{ fontSize: 'var(--text-xs)', padding: '4px var(--space-3)', borderRadius: 'var(--radius-full)', border: `1px solid ${brand}66`, background: `${brand}1a`, color: brand }}>Destaque</span>
        <span className="font-semibold" style={{ fontSize: 'var(--text-sm)', color: brand }}>Ver mais →</span>
      </div>
    </div>
  )
}

export default function ConfigPage() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data as SettingsForm,
  })

  const [form, setForm] = useState<SettingsForm>({})
  // Telefones ficam no form como dígitos BR (DDD+número) e voltam a +55... no salvar.
  useEffect(() => {
    if (settings) setForm({
      ...settings,
      phone: brDigitsFromStored(settings.phone),
      whatsAppNumber: brDigitsFromStored(settings.whatsAppNumber),
    })
  }, [settings])
  const [tab, setTab] = useState<Tab>('aparencia')

  const update = useMutation({
    mutationFn: () => api.put('/settings', {
      ...form,
      phone:          form.phone ? toE164BR(form.phone) : '',
      whatsAppNumber: form.whatsAppNumber ? toE164BR(form.whatsAppNumber) : '',
      slotIntervalMinutes: toNum(form.slotIntervalMinutes),
      maxAdvanceDays:      toNum(form.maxAdvanceDays),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['public-info'] })
      // aplica o tema imediatamente em todo o painel
      applyTenantTheme({ primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, accentColor: form.accentColor })
      toast.success('Configurações salvas e tema aplicado!')
    },
    onError: () => toast.error('Erro ao salvar.'),
  })

  const set = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setVal = (k: keyof SettingsForm, v: any) => setForm(f => ({ ...f, [k]: v }))

  if (isLoading)
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>

  const brand = form.secondaryColor || '#c9a84c'
  const hero  = form.primaryColor   || '#1a1a1a'

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="ds-page-title">Configurações</h2>
          <p className="ds-page-sub">Identidade, aparência e regras de agendamento da sua barbearia.</p>
        </div>
        <Button onClick={() => update.mutate()} loading={update.isPending}>
          {!update.isPending && <Save size={16} />}
          {update.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>

      {/* Abas + conteúdo */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sub-sidebar de abas */}
        <div className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 md:w-[200px] flex-shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`ds-config-tab ${tab === id ? 'ds-config-tab-active' : ''}`}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba ativa — o form continua único no componente pai;
            trocar de aba só troca qual SectionCard é renderizado, sem refetch
            nem perda de dado digitado nas outras abas. */}
        <div className="flex-1 space-y-6 min-w-0">
          {tab === 'aparencia' && (
            <SectionCard icon={Palette} title="Aparência" desc="As cores da sua marca — aplicadas no painel e na página pública dos clientes.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <ColorField label="Cor da marca" hint="Botões, links e destaques em todo o site."
                    value={form.secondaryColor} fallback="#c9a84c" onChange={v => setVal('secondaryColor', v)} />
                  <ColorField label="Cor do topo" hint="Fundo do banner da página pública."
                    value={form.primaryColor} fallback="#1a1a1a" onChange={v => setVal('primaryColor', v)} />
                  <p className="ds-text-disabled flex items-center gap-1.5" style={{ fontSize: 'var(--text-xs)' }}>
                    <Check size={13} style={{ color: 'var(--accent)' }} /> O contraste do texto se ajusta sozinho para manter a leitura.
                  </p>
                </div>
                <div>
                  <p className="ds-label mb-2">Prévia ao vivo</p>
                  <ThemePreview brand={brand} hero={hero} logoUrl={form.logoUrl} name={form.businessName} />
                </div>
              </div>
            </SectionCard>
          )}

          {tab === 'fotos' && (
            <SectionCard icon={ImageIcon} title="Fotos" desc="Logo e capa que aparecem na sua página pública.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageField label="Logo" hint="PNG/JPG, quadrado, até 5 MB" value={form.logoUrl} onChange={v => setVal('logoUrl', v)} />
                <ImageField label="Imagem de capa" hint="Banner da página pública" value={form.coverImageUrl} onChange={v => setVal('coverImageUrl', v)} tall />
              </div>
            </SectionCard>
          )}

          {tab === 'identidade' && (
            <SectionCard icon={Store} title="Identidade" desc="Nome, contato e endereço — aparecem na página pública e nas mensagens.">
              <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.businessName ?? ''} onChange={set('businessName')} /></div>
              <div className="ds-field"><label className="ds-label">Descrição</label><textarea className="ds-input resize-none" style={{ height: 80, paddingTop: 8 }} value={form.description ?? ''} onChange={set('description')} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PhoneField label="Telefone" value={form.phone ?? ''} onChange={d => setVal('phone', d)} />
                <PhoneField label="WhatsApp" value={form.whatsAppNumber ?? ''} onChange={d => setVal('whatsAppNumber', d)} />
              </div>
              <div className="ds-field"><label className="ds-label">Instagram</label><input className="ds-input" value={form.instagramUrl ?? ''} onChange={set('instagramUrl')} placeholder="https://instagram.com/sua_barbearia" /></div>
              <div className="ds-field"><label className="ds-label">Endereço</label><input className="ds-input" value={form.address ?? ''} onChange={set('address')} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="ds-field col-span-2"><label className="ds-label">Cidade</label><input className="ds-input" value={form.city ?? ''} onChange={set('city')} /></div>
                <div className="ds-field"><label className="ds-label">Estado</label><input className="ds-input" value={form.state ?? ''} onChange={set('state')} placeholder="UF" /></div>
              </div>
            </SectionCard>
          )}

          {tab === 'agenda' && (
            <SectionCard icon={CalendarClock} title="Agenda" desc="Como os clientes agendam online.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="ds-field"><label className="ds-label">Intervalo entre horários (min)</label><input type="number" min={5} step={5} className="ds-input" value={form.slotIntervalMinutes ?? 15} onChange={set('slotIntervalMinutes')} /></div>
                <div className="ds-field"><label className="ds-label">Antecedência máxima (dias)</label><input type="number" min={1} className="ds-input" value={form.maxAdvanceDays ?? 30} onChange={set('maxAdvanceDays')} /></div>
              </div>
              <Toggle label="Permitir agendamento online" desc="Clientes podem marcar pela página pública." checked={form.allowOnlineBooking ?? true} onChange={v => setVal('allowOnlineBooking', v)} />
              <Toggle label="Exigir confirmação manual" desc="Você aprova cada agendamento antes de confirmar." checked={form.requireConfirmation ?? false} onChange={v => setVal('requireConfirmation', v)} />
              <Toggle label="Preço por barbeiro" desc="Quando ativado, cada barbeiro pode ter seu próprio preço por serviço. O cliente verá o preço do barbeiro escolhido na hora de agendar." checked={form.customPriceEnabled ?? false} onChange={v => setVal('customPriceEnabled', v)} />
            </SectionCard>
          )}

          {tab === 'horarios' && (
            <SectionCard icon={Clock} title="Horários de funcionamento" desc="Dias e horários em que a barbearia abre — mostrados na página pública.">
              <div className="space-y-2">
                {(form.businessHours ?? []).map((h, i) => (
                  <div key={h.dayOfWeek} className="flex items-center gap-3 flex-wrap" style={{ padding: 'var(--space-2) 0' }}>
                    <button type="button" role="switch" aria-checked={h.isOpen}
                      onClick={() => setVal('businessHours', (form.businessHours ?? []).map((d, j) => j === i ? { ...d, isOpen: !d.isOpen } : d))}
                      className="relative flex-shrink-0 transition-colors" style={{ width: 40, height: 22, borderRadius: 'var(--radius-full)', background: h.isOpen ? 'var(--tenant-primary)' : 'var(--bg-elevated)', border: h.isOpen ? 'none' : '1px solid var(--border-default)', cursor: 'pointer' }}>
                      <span className="absolute shadow transition-transform" style={{ top: 2, left: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: h.isOpen ? 'translateX(18px)' : 'none' }} />
                    </button>
                    <span className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)', width: 90, flexShrink: 0 }}>{weekdayNames[h.dayOfWeek]}</span>
                    {h.isOpen ? (
                      <div className="flex items-center gap-2">
                        <input type="time" className="ds-input" style={{ width: 110 }} value={h.openTime ?? '09:00'}
                          onChange={e => setVal('businessHours', (form.businessHours ?? []).map((d, j) => j === i ? { ...d, openTime: e.target.value } : d))} />
                        <span className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>até</span>
                        <input type="time" className="ds-input" style={{ width: 110 }} value={h.closeTime ?? '19:00'}
                          onChange={e => setVal('businessHours', (form.businessHours ?? []).map((d, j) => j === i ? { ...d, closeTime: e.target.value } : d))} />
                      </div>
                    ) : (
                      <span className="ds-text-disabled" style={{ fontSize: 'var(--text-sm)' }}>Fechado</span>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Toggle acessível ---------- */
function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 text-left transition-colors ds-hoverable-field"
      style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', padding: 'var(--space-3)', background: 'var(--bg-base)', cursor: 'pointer' }}>
      <div>
        <p className="ds-text-primary font-medium" style={{ fontSize: 'var(--text-sm)' }}>{label}</p>
        {desc && <p className="ds-text-disabled mt-0.5" style={{ fontSize: 'var(--text-xs)' }}>{desc}</p>}
      </div>
      <span className="relative flex-shrink-0 transition-colors" style={{ width: 44, height: 24, borderRadius: 'var(--radius-full)', background: checked ? 'var(--tenant-primary)' : 'var(--bg-elevated)', border: checked ? 'none' : '1px solid var(--border-default)' }}>
        <span className="absolute shadow transition-transform" style={{ top: 2, left: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: checked ? 'translateX(20px)' : 'none' }} />
      </span>
    </button>
  )
}
