import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Store, Palette, ImageIcon, CalendarClock, Clock, Gift } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, assetUrl } from '../../lib/api'
import { applyTenantTheme, foregroundFor, effectiveBrand, effectiveHero } from '../../lib/theme-tenant'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Textarea, Field } from '../../components/ui/Input'
import { Switch, SwitchRow, Tabs } from '../../components/ui/Controls'
import { ImageField } from '../../components/ui/ImageField'
import { NumberField } from '../../components/ui/NumberField'
import { BlockSkeleton } from '../../components/ui/Skeleton'
import { PublicLinkButtons } from '../../components/admin/PublicLinkButtons'
import { PhoneField } from '../../components/ui/PhoneField'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brDigitsFromStored, toE164BR } from '../../lib/masks'
import { useLoyaltyProgram, useUpdateLoyaltyProgram, unitLabel } from '../../features/loyalty/loyaltyApi'
import type { LoyaltyMode, LoyaltyProgram } from '../../features/loyalty/loyaltyApi'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

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
const weekOrder = [1, 2, 3, 4, 5, 6, 0]

type Tab = 'barbearia' | 'aparencia' | 'fotos' | 'agenda' | 'horarios' | 'fidelidade'
const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'barbearia',  label: 'Barbearia',  icon: Store },
  { id: 'aparencia',  label: 'Aparência',  icon: Palette },
  { id: 'fotos',      label: 'Logo e capa', icon: ImageIcon },
  { id: 'agenda',     label: 'Agendamento online', icon: CalendarClock },
  { id: 'horarios',   label: 'Horário de funcionamento', icon: Clock },
  { id: 'fidelidade', label: 'Fidelidade', icon: Gift },
]
// Endereço antigo das abas (links salvos) → novo.
const legacyTab: Record<string, Tab> = { identidade: 'barbearia' }

const toNum = (v: number | string | undefined): number | undefined =>
  v === '' || v === undefined || v === null ? undefined : Number(v)

// Telefones ficam no formulário como dígitos (DDD + número) e voltam a +55… ao salvar.
const toForm = (s: SettingsForm): SettingsForm => ({
  ...s,
  phone: brDigitsFromStored(s.phone),
  whatsAppNumber: brDigitsFromStored(s.whatsAppNumber),
})

export default function ConfigPage() {
  const [params, setParams] = useSearchParams()
  const desktop = useIsDesktop()
  const initialTab = params.get('aba') ?? ''
  const tab: Tab = (tabs.some(t => t.id === initialTab) ? initialTab : legacyTab[initialTab] ?? 'barbearia') as Tab
  const setTab = (t: Tab) => setParams({ aba: t }, { replace: true })

  const { data: settings, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data as SettingsForm,
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Configurações" subtitle="Dados da barbearia, aparência da página de agendamento e regras da agenda." />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {desktop ? (
          <nav className="w-[232px] flex-shrink-0 sticky top-6" aria-label="Seções">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-control text-sm text-left mb-0.5 ${tab === id ? 'bg-surface border border-line font-semibold text-ink shadow-[0_1px_2px_rgba(16,24,32,0.05)]' : 'text-ink-2 hover:bg-surface-3 hover:text-ink border border-transparent'}`}>
                <Icon size={16} strokeWidth={1.75} className={tab === id ? 'text-accent-ink' : ''} />
                {label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="w-full">
            <Tabs value={tab} onChange={setTab} ariaLabel="Seções" options={tabs.map(t => ({ value: t.id, label: t.label }))} />
          </div>
        )}

        <div className="flex-1 min-w-0 w-full max-w-[760px]">
          {tab === 'fidelidade' ? <LoyaltySection /> : isLoading || !settings
            ? <BlockSkeleton height={360} />
            : <SettingsSections key={dataUpdatedAt} settings={settings} tab={tab} />}
        </div>
      </div>
    </div>
  )
}

/* ---------- Seções que salvam juntas (PUT /settings) ---------- */
function SettingsSections({ settings, tab }: { settings: SettingsForm; tab: Tab }) {
  const qc = useQueryClient()
  const [initial] = useState(() => toForm(settings))
  const [form, setForm] = useState<SettingsForm>(initial)
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)

  const update = useMutation({
    mutationFn: () => api.put('/settings', {
      ...form,
      phone:          form.phone ? toE164BR(form.phone) : '',
      whatsAppNumber: form.whatsAppNumber ? toE164BR(form.whatsAppNumber) : '',
      slotIntervalMinutes: toNum(form.slotIntervalMinutes),
      maxAdvanceDays:      toNum(form.maxAdvanceDays),
    }),
    onSuccess: () => {
      // Aplica a cor na hora em todo o painel; o refetch recarrega o formulário salvo.
      applyTenantTheme({ primaryColor: form.primaryColor, secondaryColor: form.secondaryColor, accentColor: form.accentColor })
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['public-info'] })
      toast.success('Alterações salvas.')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Não foi possível salvar.')),
  })

  const set = (k: keyof SettingsForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setVal = <K extends keyof SettingsForm>(k: K, v: SettingsForm[K]) => setForm(f => ({ ...f, [k]: v }))
  const setHour = (day: number, patch: Partial<BusinessHour>) =>
    setVal('businessHours', (form.businessHours ?? []).map(h => (h.dayOfWeek === day ? { ...h, ...patch } : h)))

  const brand = effectiveBrand(form.secondaryColor)
  const hero  = effectiveHero(form.primaryColor, form.secondaryColor)

  return (
    <form onSubmit={e => { e.preventDefault(); update.mutate() }} className="space-y-6">
      {tab === 'barbearia' && (
        <>
          <Panel title="Link de agendamento" description="Endereço da sua página. Coloque na bio do Instagram e envie no WhatsApp.">
            <PublicLinkButtons />
          </Panel>
          <Panel title="Dados da barbearia" description="Aparecem na página de agendamento e nas mensagens aos clientes.">
            <div className="space-y-4">
              <Input label="Nome da barbearia" value={form.businessName ?? ''} onChange={set('businessName')} />
              <Textarea label="Sobre" optional rows={3} value={form.description ?? ''} onChange={set('description')}
                placeholder="Ex.: Corte, barba e cuidado masculino no centro desde 2016." />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PhoneField label="Telefone" value={form.phone ?? ''} onChange={d => setVal('phone', d)} />
                <PhoneField label="WhatsApp" value={form.whatsAppNumber ?? ''} onChange={d => setVal('whatsAppNumber', d)} />
              </div>
              <Input label="Instagram" optional value={form.instagramUrl ?? ''} onChange={set('instagramUrl')} placeholder="https://instagram.com/suabarbearia" />
            </div>
          </Panel>
          <Panel title="Endereço" description="Usado no botão “Como chegar” da página.">
            <div className="space-y-4">
              <Input label="Rua e número" value={form.address ?? ''} onChange={set('address')} />
              <div className="grid grid-cols-[1fr_88px] gap-4">
                <Input label="Cidade" value={form.city ?? ''} onChange={set('city')} />
                <Input label="UF" value={form.state ?? ''} onChange={set('state')} maxLength={2} className="uppercase" />
              </div>
            </div>
          </Panel>
        </>
      )}

      {tab === 'aparencia' && (
        <Panel title="Aparência" description="As cores da sua marca na página de agendamento e no painel.">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
            <div className="space-y-4">
              <ColorField label="Cor da marca" hint="Botões, seleção e destaques." value={brand} onChange={v => setVal('secondaryColor', v)} />
              <ColorField label="Cor do topo da página" hint="Fundo do cabeçalho quando não há foto de capa." value={hero} onChange={v => setVal('primaryColor', v)} />
              <p className="text-13 text-ink-3">O texto dos botões fica preto ou branco sozinho, o que der mais leitura.</p>
            </div>
            <Field label="Prévia">
              <ThemePreview brand={brand} hero={hero} logoUrl={form.logoUrl} coverUrl={form.coverImageUrl} name={form.businessName} />
            </Field>
          </div>
        </Panel>
      )}

      {tab === 'fotos' && (
        <Panel title="Logo e foto de capa" description="Aparecem no topo da página de agendamento.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ImageField label="Logo" hint="Quadrada, PNG ou JPG, até 5 MB." value={form.logoUrl} onChange={v => setVal('logoUrl', v)} />
            <ImageField label="Foto de capa" hint="Horizontal, de preferência a fachada ou o salão." value={form.coverImageUrl} onChange={v => setVal('coverImageUrl', v)} tall />
          </div>
        </Panel>
      )}

      {tab === 'agenda' && (
        <Panel title="Agendamento online" description="Como os clientes marcam horário pela página.">
          <div className="space-y-4">
            <SwitchRow title="Aceitar agendamentos pela página" description="Desligado, a página mostra só as informações da barbearia."
              checked={form.allowOnlineBooking ?? true} onChange={v => setVal('allowOnlineBooking', v)} />
            <SwitchRow title="Aprovar cada agendamento" description="O horário fica pendente até alguém da equipe confirmar."
              checked={form.requireConfirmation ?? false} onChange={v => setVal('requireConfirmation', v)} />
            <SwitchRow title="Preço diferente por barbeiro" description="Cada barbeiro pode ter o próprio preço por serviço. O cliente vê o preço de quem escolheu."
              checked={form.customPriceEnabled ?? false} onChange={v => setVal('customPriceEnabled', v)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Field label="Intervalo entre horários" hint="De quanto em quanto tempo a agenda oferece horários (minutos).">
                <NumberField min={5} step={5} placeholder="15" value={toNum(form.slotIntervalMinutes) || 15} onChange={v => setVal('slotIntervalMinutes', v)} />
              </Field>
              <Field label="Agendar com até" hint="Quantos dias à frente o cliente pode marcar.">
                <NumberField min={1} placeholder="30" value={toNum(form.maxAdvanceDays) || 30} onChange={v => setVal('maxAdvanceDays', v)} />
              </Field>
            </div>
          </div>
        </Panel>
      )}

      {tab === 'horarios' && (
        <Panel title="Horário de funcionamento" description="Mostrado na página e usado para montar a grade da agenda." pad={false}>
          <ul className="ds-list border-t border-line">
            {weekOrder.map(day => {
              const h = form.businessHours?.find(x => x.dayOfWeek === day)
              if (!h) return null
              return (
                <li key={day} className="flex items-center gap-3 px-5 py-3 border-b border-line last:border-b-0 max-lg:px-4 flex-wrap">
                  <Switch checked={h.isOpen} onChange={v => setHour(day, { isOpen: v })} label={`Aberto ${weekdayNames[day]}`} />
                  <span className="text-sm font-medium w-[72px]">{weekdayNames[day]}</span>
                  {h.isOpen ? (
                    <div className="flex items-center gap-2 ml-auto sm:ml-0">
                      <input type="time" className="ds-input t-num" style={{ width: 108 }} value={h.openTime ?? '09:00'} step={900}
                        onChange={e => setHour(day, { openTime: e.target.value })} aria-label={`Abre ${weekdayNames[day]}`} />
                      <span className="text-13 text-ink-3">às</span>
                      <input type="time" className="ds-input t-num" style={{ width: 108 }} value={h.closeTime ?? '19:00'} step={900}
                        onChange={e => setHour(day, { closeTime: e.target.value })} aria-label={`Fecha ${weekdayNames[day]}`} />
                    </div>
                  ) : (
                    <span className="text-13 text-ink-3 ml-auto sm:ml-0">Fechado</span>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {/* Barra de salvar: gruda no rodapé da tela enquanto houver alteração não salva */}
      {dirty && (
        <div className="sticky z-20 bottom-[calc(70px+env(safe-area-inset-bottom))] lg:bottom-5 animate-[ds-dialog-in_160ms_ease-out]">
          <div className="flex items-center gap-3 rounded-panel border border-line bg-surface pl-4 pr-3 py-3" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <p className="text-sm text-ink-2 flex-1">Alterações não salvas</p>
            <Button variant="ghost" size="sm" onClick={() => setForm(initial)}>Descartar</Button>
            <Button type="submit" size="sm" loading={update.isPending}>Salvar alterações</Button>
          </div>
        </div>
      )}
    </form>
  )
}

/* ---------- Cor + amostra ---------- */
function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-control border border-line bg-surface cursor-pointer hover:border-line-strong">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-11 h-11 rounded-[8px] border border-line cursor-pointer p-0.5 bg-surface flex-shrink-0" aria-label={label} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-13 text-ink-2">{hint}</span>
      </span>
      <span className="text-13 text-ink-3 t-num uppercase">{value}</span>
    </label>
  )
}

/* ---------- Prévia: topo da página de agendamento ---------- */
function ThemePreview({ brand, hero, logoUrl, coverUrl, name }: {
  brand: string; hero: string; logoUrl?: string; coverUrl?: string; name?: string
}) {
  return (
    <div className="rounded-panel border border-line overflow-hidden bg-surface" aria-hidden>
      <div className="h-[92px] relative" style={{ background: hero }}>
        {coverUrl && <img src={assetUrl(coverUrl)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-6 w-12 h-12 rounded-[10px] border-2 border-surface overflow-hidden bg-surface-3 relative">
          {logoUrl ? <img src={assetUrl(logoUrl)} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-ink-2 font-semibold">{(name || 'B')[0]}</span>}
        </div>
        <p className="mt-2 t-display text-[19px] leading-6 truncate">{name || 'Sua barbearia'}</p>
        <p className="text-xs text-ink-3">Aberto agora</p>
        <div className="mt-3 h-10 rounded-control flex items-center justify-center text-sm font-semibold" style={{ background: brand, color: foregroundFor(brand) }}>
          Agendar horário
        </div>
      </div>
    </div>
  )
}

/* ---------- Fidelidade (programa por barbearia — salvar próprio, PUT /loyalty/program) ---------- */
function LoyaltySection() {
  const { data: program, isLoading, dataUpdatedAt } = useLoyaltyProgram()
  if (isLoading || !program) return <BlockSkeleton height={280} />
  return <LoyaltyForm key={dataUpdatedAt} program={program} />
}

function LoyaltyForm({ program }: { program: LoyaltyProgram }) {
  const update = useUpdateLoyaltyProgram()
  const [enabled, setEnabled] = useState(program.isEnabled)
  const [mode, setMode]       = useState<LoyaltyMode>(program.mode)
  const [rate, setRate]       = useState(String(program.pointsPerReal))

  const save = async () => {
    const pointsPerReal = Number(rate.replace(',', '.'))
    if (mode === 'Points' && (!pointsPerReal || pointsPerReal <= 0)) {
      toast.error('Informe quantos pontos o cliente ganha por real gasto.')
      return
    }
    try {
      await update.mutateAsync({ isEnabled: enabled, mode, pointsPerReal: pointsPerReal || 1 })
      toast.success(enabled ? 'Programa de fidelidade ativado.' : 'Programa de fidelidade salvo.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar a fidelidade.'))
    }
  }

  const example = mode === 'Points'
    ? `Um corte de R$ 45 rende ${Math.floor(45 * (Number(rate.replace(',', '.')) || 0))} ${unitLabel('Points', 2)} (arredonda para baixo).`
    : 'Cada atendimento concluído vale 1 corte no cartão do cliente.'

  return (
    <Panel title="Programa de fidelidade"
      description="Com o programa ligado, a aba Fidelidade aparece no menu e o cliente acompanha o saldo e troca por recompensas na área dele.">
      <div className="space-y-5">
        <SwitchRow title="Programa ativo" description="Desligado, nada de saldo aparece, nem para o cliente nem no painel."
          checked={enabled} onChange={setEnabled} />

        {enabled && (
          <>
            <Field label="Como o cliente acumula">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { id: 'Visits', title: 'Cartão de cortes', desc: '1 corte por atendimento concluído.' },
                  { id: 'Points', title: 'Pontos por valor', desc: 'Pontos proporcionais ao valor gasto.' },
                ] as const).map(opt => (
                  <button key={opt.id} type="button" className="ds-choice" aria-pressed={mode === opt.id} onClick={() => setMode(opt.id)}>
                    <span className="text-sm font-semibold">{opt.title}</span>
                    <span className="text-13 text-ink-2">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </Field>

            {mode === 'Points' && (
              <Input label="Pontos por real gasto" type="number" inputMode="decimal" min="0.01" step="0.1"
                value={rate} onChange={e => setRate(e.target.value)} fieldClassName="max-w-[240px]" />
            )}
            <p className="text-13 text-ink-2">{example}</p>
          </>
        )}

        <div className="pt-1">
          <Button onClick={save} loading={update.isPending}>Salvar fidelidade</Button>
        </div>
      </div>
    </Panel>
  )
}
