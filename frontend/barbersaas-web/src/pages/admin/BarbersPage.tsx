import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Scissors, ChevronRight, Clock, Pencil } from 'lucide-react'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea, Field } from '../../components/ui/Input'
import { Pill } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { Switch, SwitchRow } from '../../components/ui/Controls'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { PhoneField } from '../../components/ui/PhoneField'
import { NumberField } from '../../components/ui/NumberField'
import { EditBarberModal } from '../../components/admin/EditBarberModal'
import { ScheduleModal } from '../../components/admin/ScheduleModal'
import { useBarbers, useCreateBarber, useToggleBarber } from '../../features/barbers/barbersApi'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { toE164BR, formatPhoneBR } from '../../lib/masks'
import { payModel } from '../../lib/barber'
import type { Barber } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const EMPTY_FORM = { name: '', phone: '', bio: '', commissionType: 0, commissionValue: 50, chairRentEnabled: false, chairRentAmount: 0, chairRentPeriod: 1 }

export default function BarbersPage() {
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const { data: barbers, isLoading } = useBarbers()
  const create = useCreateBarber()
  const toggle = useToggleBarber()
  const [showForm, setShowForm] = useState(false)
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null)
  const [editBarber, setEditBarber] = useState<Barber | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { chairRentEnabled, chairRentAmount, chairRentPeriod, ...rest } = form
      await create.mutateAsync({
        ...rest,
        phone: form.phone ? toE164BR(form.phone) : undefined,
        chairRentAmount: chairRentEnabled && chairRentAmount > 0 ? chairRentAmount : null,
        chairRentPeriod: chairRentEnabled && chairRentAmount > 0 ? chairRentPeriod : null,
      })
      toast.success('Barbeiro cadastrado.')
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível cadastrar.')) }
  }

  const onToggle = (b: Barber) =>
    toggle.mutate(b.id, {
      onSuccess: () => toast.success(b.isActive ? `${b.name} desativado.` : `${b.name} ativado.`),
      onError: () => toast.error('Não foi possível alterar o status.'),
    })

  const sorted = [...(barbers ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.displayOrder - b.displayOrder)
  const activeCount = sorted.filter(b => b.isActive).length

  return (
    <div className="space-y-5">
      <PageHeader title="Barbeiros"
        subtitle={barbers ? `${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'} na equipe` : undefined}
        actions={<Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true) }}><Plus size={16} /> <span className="lbl-long">Novo barbeiro</span><span className="lbl-short">Novo</span></Button>} />

      {isLoading ? <ListSkeleton rows={3} /> : !sorted.length ? (
        <EmptyState boxed icon={Scissors} title="Nenhum barbeiro cadastrado"
          hint="Cadastre a equipe para abrir a agenda e receber agendamentos pelo link."
          action={<Button variant="secondary" onClick={() => setShowForm(true)}><Plus size={16} /> Cadastrar barbeiro</Button>} />
      ) : desktop ? (
        <Panel pad={false}>
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Barbeiro</th>
                  <th>Remuneração</th>
                  <th>Página de agendamento</th>
                  <th>Ativo</th>
                  <th className="ds-right"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(b => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/admin/barbeiros/${b.id}`} className="flex items-center gap-3 group">
                        <Avatar name={b.name} src={b.photoUrl} size={36} />
                        <div className="min-w-0">
                          <p className="font-semibold group-hover:underline underline-offset-2">{b.name}</p>
                          <p className="text-13 text-ink-3 t-num">{b.phone ? formatPhoneBR(b.phone) : 'Sem telefone'}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="ds-muted">{payModel(b)}</td>
                    <td>{b.showInPublicPage ? <Pill tone="ok">Aparece</Pill> : <Pill tone="neutral">Oculto</Pill>}</td>
                    <td><Switch checked={b.isActive} onChange={() => onToggle(b)} label={`${b.name} ativo`} disabled={toggle.isPending} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setScheduleBarber(b)}><Clock size={15} /> Horários</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditBarber(b)}><Pencil size={15} /> Editar</Button>
                        <Button variant="ghost" size="sm" icon onClick={() => navigate(`/admin/barbeiros/${b.id}`)} aria-label={`Abrir perfil de ${b.name}`}><ChevronRight size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel pad={false}>
          <ul className="ds-list">
            {sorted.map(b => (
              <li key={b.id}>
                <Link to={`/admin/barbeiros/${b.id}`} className="ds-row">
                  <Avatar name={b.name} src={b.photoUrl} size={40} />
                  <div className="ds-row-main">
                    <p className="ds-row-title">{b.name}</p>
                    <p className="ds-row-sub">{payModel(b)}</p>
                  </div>
                  {!b.isActive && <Pill tone="neutral">Inativo</Pill>}
                  <ChevronRight size={16} className="text-ink-3 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo barbeiro" size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="new-barber" loading={create.isPending}>Cadastrar barbeiro</Button>
        </>}>
        <form id="new-barber" onSubmit={handleCreate} className="space-y-5">
          <Input label="Nome" value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <PhoneField label="Telefone" optional value={form.phone} onChange={d => setForm(f => ({ ...f, phone: d }))} />
          <Textarea label="Apresentação" optional rows={2} value={form.bio} placeholder="Especialidades, tempo de profissão…"
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          <fieldset className="space-y-3">
            <legend className="ds-label mb-2">Remuneração</legend>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Comissão" value={form.commissionType} onChange={e => setForm(f => ({ ...f, commissionType: +e.target.value }))}>
                <option value={0}>Percentual (%)</option>
                <option value={1}>Valor fixo (R$)</option>
              </Select>
              <Field label={form.commissionType === 1 ? 'Valor por atendimento' : 'Percentual'}>
                <NumberField min={0} step="0.01" value={form.commissionValue} onChange={v => setForm(f => ({ ...f, commissionValue: v }))} />
              </Field>
            </div>
            <SwitchRow title="Cobrar aluguel de cadeira" description="O barbeiro paga um valor fixo pelo espaço. Pode somar com a comissão."
              checked={form.chairRentEnabled} onChange={v => setForm(f => ({ ...f, chairRentEnabled: v }))} />
            {form.chairRentEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Valor (R$)">
                  <NumberField min={0} step="0.01" placeholder="0,00" value={form.chairRentAmount}
                    onChange={v => setForm(f => ({ ...f, chairRentAmount: v }))} required />
                </Field>
                <Select label="Cobrança" value={form.chairRentPeriod} onChange={e => setForm(f => ({ ...f, chairRentPeriod: +e.target.value }))}>
                  <option value={0}>Semanal</option>
                  <option value={1}>Mensal</option>
                </Select>
              </div>
            )}
          </fieldset>
        </form>
      </Modal>

      {editBarber && <EditBarberModal barber={editBarber} onClose={() => setEditBarber(null)} />}
      {scheduleBarber && <ScheduleModal barber={scheduleBarber} onClose={() => setScheduleBarber(null)} />}
    </div>
  )
}
