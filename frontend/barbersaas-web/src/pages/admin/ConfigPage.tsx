import { useState, useEffect, useRef } from 'react'
import { Loader2, Save, Upload, X, Image as ImageIcon, Palette, Store, CalendarClock, Check, Scissors } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { applyTenantTheme } from '../../lib/theme-tenant'
import toast from 'react-hot-toast'

interface SettingsForm {
  businessName?: string; description?: string
  phone?: string; whatsAppNumber?: string; instagramUrl?: string
  address?: string; city?: string; state?: string; zipCode?: string
  primaryColor?: string; secondaryColor?: string; accentColor?: string
  logoUrl?: string; coverImageUrl?: string
  slotIntervalMinutes?: number | string; maxAdvanceDays?: number | string
  allowOnlineBooking?: boolean; requireConfirmation?: boolean
}

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

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/uploads', fd, { headers: { 'Content-Type': undefined } as any })
  return res.data.data.url as string
}

/* ---------- Campo de upload de imagem (preview + trocar + remover) ---------- */
function ImageField({ label, hint, value, onChange, tall }: {
  label: string; hint?: string; value?: string; onChange: (url: string) => void; tall?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const pick = () => inputRef.current?.click()
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { onChange(await uploadImage(file)); toast.success('Imagem enviada — clique em Salvar para aplicar.') }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Erro ao enviar imagem.') }
    finally { setBusy(false) }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {value ? (
        <div className="relative group">
          <img src={value} alt={label}
            className={`w-full ${tall ? 'h-36' : 'h-28'} object-cover rounded-xl border border-border bg-surfaceHover`} />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
            <button type="button" onClick={pick} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Trocar
            </button>
            <button type="button" onClick={() => onChange('')} className="btn-danger text-xs px-3 py-1.5"><X size={13} /> Remover</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={busy}
          className={`w-full ${tall ? 'h-36' : 'h-28'} rounded-xl border-2 border-dashed border-border hover:border-accent/60 hover:bg-surfaceHover transition-colors flex flex-col items-center justify-center gap-1 text-subtle`}>
          {busy ? <Loader2 size={20} className="animate-spin text-accent" /> : <ImageIcon size={22} />}
          <span className="text-xs">{busy ? 'Enviando…' : 'Clique para enviar'}</span>
        </button>
      )}
      {hint && <p className="text-xs text-subtle mt-1.5">{hint}</p>}
    </div>
  )
}

function SectionCard({ icon: Icon, title, desc, children }: {
  icon: any; title: string; desc?: string; children: React.ReactNode
}) {
  return (
    <section className="card space-y-5">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0"><Icon size={18} /></div>
        <div>
          <h3 className="font-semibold text-content">{title}</h3>
          {desc && <p className="text-xs text-subtle mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

/* ---------- Seletor de cor com legenda do efeito ---------- */
function ColorField({ label, hint, value, fallback, onChange }: {
  label: string; hint: string; value?: string; fallback: string; onChange: (v: string) => void
}) {
  const v = value || fallback
  return (
    <div className="rounded-xl border border-border p-3 flex items-center gap-3">
      <input type="color" value={v} onChange={e => onChange(e.target.value)}
        className="w-11 h-11 rounded-lg cursor-pointer bg-transparent flex-shrink-0" aria-label={label} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-content">{label}</p>
        <p className="text-xs text-subtle">{hint}</p>
      </div>
      <span className="text-xs font-mono text-muted uppercase flex-shrink-0">{v}</span>
    </div>
  )
}

/* ---------- Prévia ao vivo (espelha a página pública + componentes) ---------- */
function ThemePreview({ brand, hero, logoUrl, name }: {
  brand: string; hero: string; logoUrl?: string; name?: string
}) {
  const fg = fgFor(brand)
  return (
    <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="h-24 flex flex-col items-center justify-center gap-1.5"
        style={{ background: `linear-gradient(to bottom, ${hero}, rgb(var(--surface)))` }}>
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border-2" style={{ borderColor: `${brand}80` }} />
          : <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: brand }}>
              <Scissors size={18} style={{ color: fg }} />
            </div>}
        <span className="text-sm font-bold text-content drop-shadow">{name || 'Sua Barbearia'}</span>
      </div>
      <div className="p-4 flex items-center gap-3 flex-wrap bg-surface">
        <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          style={{ background: brand, color: fg }}>
          <Check size={14} /> Agendar
        </button>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
          style={{ color: brand, borderColor: `${brand}66`, background: `${brand}1a` }}>Destaque</span>
        <span className="text-sm font-semibold" style={{ color: brand }}>Ver mais →</span>
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
  useEffect(() => { if (settings) setForm(settings) }, [settings])

  const update = useMutation({
    mutationFn: () => api.put('/settings', {
      ...form,
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
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-accent" /></div>

  const brand = form.secondaryColor || '#c9a84c'
  const hero  = form.primaryColor   || '#1a1a1a'

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-content">Configurações</h2>
          <p className="text-sm text-muted mt-0.5">Identidade, aparência e regras de agendamento da sua barbearia.</p>
        </div>
        <button onClick={() => update.mutate()} disabled={update.isPending} className="btn-primary">
          {update.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {update.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>

      {/* Aparência */}
      <SectionCard icon={Palette} title="Aparência" desc="As cores da sua marca — aplicadas no painel e na página pública dos clientes.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <ColorField label="Cor da marca" hint="Botões, links e destaques em todo o site."
              value={form.secondaryColor} fallback="#c9a84c" onChange={v => setVal('secondaryColor', v)} />
            <ColorField label="Cor do topo" hint="Fundo do banner da página pública."
              value={form.primaryColor} fallback="#1a1a1a" onChange={v => setVal('primaryColor', v)} />
            <p className="text-xs text-subtle flex items-center gap-1.5">
              <Check size={13} className="text-accent" /> O contraste do texto se ajusta sozinho para manter a leitura.
            </p>
          </div>
          <div>
            <p className="label">Prévia ao vivo</p>
            <ThemePreview brand={brand} hero={hero} logoUrl={form.logoUrl} name={form.businessName} />
          </div>
        </div>
      </SectionCard>

      {/* Fotos */}
      <SectionCard icon={ImageIcon} title="Fotos" desc="Logo e capa que aparecem na sua página pública.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageField label="Logo" hint="PNG/JPG, quadrado, até 5 MB" value={form.logoUrl} onChange={v => setVal('logoUrl', v)} />
          <ImageField label="Imagem de capa" hint="Banner da página pública" value={form.coverImageUrl} onChange={v => setVal('coverImageUrl', v)} tall />
        </div>
      </SectionCard>

      {/* Identidade */}
      <SectionCard icon={Store} title="Identidade" desc="Nome, contato e endereço — aparecem na página pública e nas mensagens.">
        <div><label className="label">Nome</label><input className="input" value={form.businessName ?? ''} onChange={set('businessName')} /></div>
        <div><label className="label">Descrição</label><textarea className="input resize-none h-20" value={form.description ?? ''} onChange={set('description')} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Telefone</label><input className="input" value={form.phone ?? ''} onChange={set('phone')} placeholder="+5511999999999" /></div>
          <div><label className="label">WhatsApp</label><input className="input" value={form.whatsAppNumber ?? ''} onChange={set('whatsAppNumber')} placeholder="+5511999999999" /></div>
        </div>
        <div><label className="label">Instagram</label><input className="input" value={form.instagramUrl ?? ''} onChange={set('instagramUrl')} placeholder="https://instagram.com/sua_barbearia" /></div>
        <div><label className="label">Endereço</label><input className="input" value={form.address ?? ''} onChange={set('address')} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className="label">Cidade</label><input className="input" value={form.city ?? ''} onChange={set('city')} /></div>
          <div><label className="label">Estado</label><input className="input" value={form.state ?? ''} onChange={set('state')} placeholder="UF" /></div>
        </div>
      </SectionCard>

      {/* Agenda */}
      <SectionCard icon={CalendarClock} title="Agenda" desc="Como os clientes agendam online.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Intervalo entre horários (min)</label><input type="number" min={5} step={5} className="input" value={form.slotIntervalMinutes ?? 15} onChange={set('slotIntervalMinutes')} /></div>
          <div><label className="label">Antecedência máxima (dias)</label><input type="number" min={1} className="input" value={form.maxAdvanceDays ?? 30} onChange={set('maxAdvanceDays')} /></div>
        </div>
        <Toggle label="Permitir agendamento online" desc="Clientes podem marcar pela página pública." checked={form.allowOnlineBooking ?? true} onChange={v => setVal('allowOnlineBooking', v)} />
        <Toggle label="Exigir confirmação manual" desc="Você aprova cada agendamento antes de confirmar." checked={form.requireConfirmation ?? false} onChange={v => setVal('requireConfirmation', v)} />
      </SectionCard>
    </div>
  )
}

/* ---------- Toggle acessível ---------- */
function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 rounded-xl border border-border p-3 text-left hover:bg-surfaceHover transition-colors">
      <div>
        <p className="text-sm font-medium text-content">{label}</p>
        {desc && <p className="text-xs text-subtle mt-0.5">{desc}</p>}
      </div>
      <span className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${checked ? 'bg-accent' : 'bg-surfaceHover border border-border'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}
