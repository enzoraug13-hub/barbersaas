import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { ImageField } from '../ui/ImageField'
import { useUpdateBarber } from '../../features/barbers/barbersApi'
import { PhoneField } from '../ui/PhoneField'
import { brDigitsFromStored, toE164BR } from '../../lib/masks'
import type { Barber } from '../../types'
import toast from 'react-hot-toast'

// Modal de edição do barbeiro (Parte C). Reusado na lista (BarbersPage) e no perfil (Parte D).
export function EditBarberModal({ barber, onClose }: { barber: Barber; onClose: () => void }) {
  const update = useUpdateBarber()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: barber.name,
    photoUrl: barber.photoUrl ?? '',
    bio: barber.bio ?? '',
    phone: brDigitsFromStored(barber.phone),
    commissionType: barber.commissionType ?? 0,
    commissionValue: barber.commissionValue ?? 0,
    showInPublicPage: barber.showInPublicPage,
    displayOrder: barber.displayOrder ?? 0,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: (k === 'commissionType' || k === 'commissionValue' || k === 'displayOrder') ? +e.target.value : e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({
        id: barber.id,
        data: {
          name: form.name.trim(),
          photoUrl: form.photoUrl || undefined,
          bio: form.bio.trim() || undefined,
          phone: form.phone ? toE164BR(form.phone) : undefined,
          commissionType: form.commissionType,
          commissionValue: form.commissionValue,
          showInPublicPage: form.showInPublicPage,
          displayOrder: form.displayOrder,
        },
      })
      setSaved(true)
      toast.success('Barbeiro atualizado!')
      setTimeout(onClose, 800)
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar.')
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Editar barbeiro" subtitle={barber.name}
      panelClassName="max-w-lg max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <ImageField
          label="Foto"
          hint="Aparece nos cards e na página pública. PNG, JPG ou WEBP."
          value={form.photoUrl}
          onChange={(url) => setForm(f => ({ ...f, photoUrl: url }))}
          tall
        />

        <div className="ds-field">
          <label className="ds-label">Nome</label>
          <input className="ds-input" value={form.name} onChange={set('name')} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PhoneField label="Telefone" value={form.phone} onChange={d => setForm(f => ({ ...f, phone: d }))} />
          <div className="ds-field">
            <label className="ds-label">Ordem de exibição</label>
            <input type="number" min={0} className="ds-input" value={form.displayOrder} onChange={set('displayOrder')} />
          </div>
        </div>

        <div className="ds-field">
          <label className="ds-label">Bio</label>
          <textarea className="ds-input" rows={3} value={form.bio} onChange={set('bio')} style={{ resize: 'vertical' }}
            placeholder="Especialidades, experiência…" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="ds-field">
            <label className="ds-label">Comissão</label>
            <select className="ds-input" value={form.commissionType} onChange={set('commissionType')}>
              <option value={0}>Percentual (%)</option>
              <option value={1}>Fixo (R$)</option>
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label">Valor</label>
            <input type="number" min={0} step="0.01" className="ds-input" value={form.commissionValue} onChange={set('commissionValue')} />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none"
          style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
          <input type="checkbox" checked={form.showInPublicPage}
            onChange={e => setForm(f => ({ ...f, showInPublicPage: e.target.checked }))}
            className="w-4 h-4 flex-shrink-0" style={{ accentColor: 'var(--accent)' }} />
          <span className="ds-text-primary" style={{ fontSize: 'var(--text-sm)' }}>Exibir na página pública de agendamento</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={update.isPending} disabled={saved}>
            {saved ? <><Check size={16} /> Salvo!</> : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
