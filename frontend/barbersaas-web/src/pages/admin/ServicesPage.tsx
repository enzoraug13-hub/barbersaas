import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Field } from '../../components/ui/Input'
import { Switch, SwitchRow } from '../../components/ui/Controls'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { NumberField } from '../../components/ui/NumberField'
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../../features/services/servicesApi'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl } from '../../lib/format'
import type { Service } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

// Cores para distinguir os serviços na grade da agenda.
const SWATCHES = ['#3B6EA8', '#2E7D5B', '#8A5A2B', '#A0527C', '#6E5BA8', '#C26A2E', '#2F8C93', '#8C96A0']
const EMPTY_FORM = { name: '', description: '', durationMinutes: 30, price: 0, colorHex: SWATCHES[0], showInPublicPage: true }

const duration = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`)

export default function ServicesPage() {
  const desktop = useIsDesktop()
  const { data: services, isLoading } = useServices()
  const create  = useCreateService()
  const update  = useUpdateService()
  const remove  = useDeleteService()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Service | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (s: Service) => {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      durationMinutes: s.durationMinutes,
      price: s.price,
      colorHex: s.colorHex ?? SWATCHES[0],
      showInPublicPage: s.showInPublicPage,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...form, description: form.description || undefined })
        toast.success('Serviço atualizado.')
      } else {
        await create.mutateAsync(form)
        toast.success('Serviço criado.')
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível salvar o serviço.')) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await remove.mutateAsync(confirmDelete.id)
      toast.success('Serviço excluído.')
      setConfirmDelete(null); setShowForm(false)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível excluir.')) }
  }

  // Mostrar/ocultar na página de agendamento com um clique (PUT /services/{id}).
  const togglePublic = async (s: Service) => {
    try {
      await update.mutateAsync({
        id: s.id, name: s.name, description: s.description || undefined,
        durationMinutes: s.durationMinutes, price: s.price,
        colorHex: s.colorHex || undefined, showInPublicPage: !s.showInPublicPage,
      })
      toast.success(!s.showInPublicPage ? `${s.name} agora aparece para os clientes.` : `${s.name} ficou oculto para os clientes.`)
    } catch { toast.error('Não foi possível alterar a visibilidade.') }
  }

  const list = [...(services ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <PageHeader title="Serviços e preços"
        subtitle={services ? 'Duração e preço de cada serviço. Os visíveis aparecem para o cliente ao agendar.' : undefined}
        actions={<Button onClick={openCreate}><Plus size={16} /> <span className="lbl-long">Novo serviço</span><span className="lbl-short">Novo</span></Button>} />

      {isLoading ? <ListSkeleton rows={4} /> : !list.length ? (
        <EmptyState boxed icon={Tag} title="Nenhum serviço cadastrado"
          hint="Cadastre corte, barba e o que mais a barbearia oferece, com duração e preço."
          action={<Button variant="secondary" onClick={openCreate}><Plus size={16} /> Cadastrar serviço</Button>} />
      ) : desktop ? (
        <Panel pad={false}>
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th className="ds-right">Duração</th>
                  <th className="ds-right">Preço</th>
                  <th>Na página de agendamento</th>
                  <th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.colorHex || '#8C96A0' }} aria-hidden />
                        <div className="min-w-0">
                          <p className="font-medium">{s.name}</p>
                          {s.description && <p className="text-13 text-ink-3 truncate max-w-[46ch]">{s.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="ds-num ds-muted">{duration(s.durationMinutes)}</td>
                    <td className="ds-num font-semibold">{brl(s.price)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.showInPublicPage} onChange={() => togglePublic(s)} disabled={update.isPending}
                          label={`Mostrar ${s.name} na página de agendamento`} />
                        <span className="text-13 text-ink-2">{s.showInPublicPage ? 'Visível' : 'Oculto'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil size={15} /> Editar</Button>
                        <Button variant="ghost" size="sm" icon onClick={() => setConfirmDelete(s)} aria-label={`Excluir ${s.name}`}><Trash2 size={15} /></Button>
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
            {list.map(s => (
              <li key={s.id}>
                <button type="button" className="ds-row" onClick={() => openEdit(s)}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.colorHex || '#8C96A0' }} aria-hidden />
                  <div className="ds-row-main">
                    <p className="ds-row-title">{s.name}</p>
                    <p className="ds-row-sub">{duration(s.durationMinutes)}{s.showInPublicPage ? '' : ', oculto para clientes'}</p>
                  </div>
                  <span className="font-semibold t-num">{brl(s.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar serviço' : 'Novo serviço'}
        footer={<>
          {editing && <Button variant="danger-ghost" className="sm:mr-auto" onClick={() => setConfirmDelete(editing)}><Trash2 size={15} /> Excluir</Button>}
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="service-form" loading={create.isPending || update.isPending}>{editing ? 'Salvar' : 'Criar serviço'}</Button>
        </>}>
        <form id="service-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex.: Corte masculino" />
          <Input label="Descrição" optional value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Ex.: Máquina e tesoura, com lavagem" hint="Aparece para o cliente na hora de escolher." />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duração (min)">
              <NumberField value={form.durationMinutes} onChange={v => setForm(f => ({ ...f, durationMinutes: v }))} min={5} step={5} placeholder="30" required />
            </Field>
            <Field label="Preço (R$)">
              <NumberField step="0.01" value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} min={0} placeholder="0,00" required />
            </Field>
          </div>
          <Field label="Cor na agenda">
            <div className="flex items-center gap-2 flex-wrap">
              {SWATCHES.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, colorHex: c }))}
                  aria-label={`Cor ${c}`} aria-pressed={form.colorHex.toLowerCase() === c.toLowerCase()}
                  className="w-8 h-8 rounded-full border-2 transition-shadow"
                  style={{
                    background: c,
                    borderColor: 'var(--surface)',
                    boxShadow: form.colorHex.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}` : '0 0 0 1px var(--line)',
                  }} />
              ))}
              <label className="ds-btn ds-btn-ghost ds-btn-sm cursor-pointer">
                <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="w-5 h-5 rounded-full border-0 p-0 bg-transparent cursor-pointer" aria-label="Escolher outra cor" />
                Outra
              </label>
            </div>
          </Field>
          <SwitchRow title="Aparece na página de agendamento" description="Desligado, só a equipe consegue marcar este serviço."
            checked={form.showInPublicPage} onChange={v => setForm(f => ({ ...f, showInPublicPage: v }))} />
        </form>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Excluir ${confirmDelete?.name ?? 'serviço'}?`}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Voltar</Button>
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>Excluir serviço</Button>
        </>}>
        <p className="text-sm text-ink-2">O serviço sai do cardápio e da página de agendamento. Os atendimentos já feitos continuam no histórico.</p>
      </Modal>
    </div>
  )
}
