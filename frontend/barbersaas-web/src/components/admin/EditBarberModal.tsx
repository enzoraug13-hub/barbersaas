import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input, Select, Textarea, Field } from '../ui/Input'
import { SwitchRow } from '../ui/Controls'
import { ImageField } from '../ui/ImageField'
import { useUpdateBarber } from '../../features/barbers/barbersApi'
import { PhoneField } from '../ui/PhoneField'
import { NumberField } from '../ui/NumberField'
import { brDigitsFromStored, toE164BR } from '../../lib/masks'
import type { Barber } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

// Edição do barbeiro — usada na lista (Barbeiros) e no perfil.
export function EditBarberModal({ barber, onClose }: { barber: Barber; onClose: () => void }) {
  const update = useUpdateBarber()
  const [form, setForm] = useState({
    name: barber.name,
    photoUrl: barber.photoUrl ?? '',
    bio: barber.bio ?? '',
    phone: brDigitsFromStored(barber.phone),
    commissionType: barber.commissionType ?? 0,
    commissionValue: barber.commissionValue ?? 0,
    showInPublicPage: barber.showInPublicPage,
    displayOrder: barber.displayOrder ?? 0,
    chairRentEnabled: barber.chairRentAmount != null,
    chairRentAmount: barber.chairRentAmount ?? 0,
    chairRentPeriod: barber.chairRentPeriod ?? 1, // mensal por padrão
  })

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
          chairRentAmount: form.chairRentEnabled && form.chairRentAmount > 0 ? form.chairRentAmount : null,
          chairRentPeriod: form.chairRentEnabled && form.chairRentAmount > 0 ? form.chairRentPeriod : null,
        },
      })
      toast.success('Barbeiro atualizado.')
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar.'))
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Editar barbeiro" subtitle={barber.name} size="lg"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="edit-barber" loading={update.isPending}>Salvar alterações</Button>
      </>}>
      <form id="edit-barber" onSubmit={handleSubmit} className="space-y-5">
        <ImageField label="Foto" round hint="Aparece na agenda e na página de agendamento."
          value={form.photoUrl} onChange={url => setForm(f => ({ ...f, photoUrl: url }))} />

        <Input label="Nome" value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
          <PhoneField label="Telefone" optional value={form.phone} onChange={d => setForm(f => ({ ...f, phone: d }))} />
          <Field label="Ordem na página" hint="Menor aparece primeiro.">
            <NumberField min={0} value={form.displayOrder} onChange={v => setForm(f => ({ ...f, displayOrder: v }))} />
          </Field>
        </div>

        <Textarea label="Apresentação" optional rows={3} value={form.bio} placeholder="Especialidades, tempo de profissão…"
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />

        <fieldset className="space-y-3">
          <legend className="ds-label mb-2">Remuneração</legend>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Comissão" value={form.commissionType}
              onChange={e => setForm(f => ({ ...f, commissionType: +e.target.value }))}>
              <option value={0}>Percentual (%)</option>
              <option value={1}>Valor fixo (R$)</option>
            </Select>
            <Field label={form.commissionType === 1 ? 'Valor por atendimento' : 'Percentual'}>
              <NumberField min={0} step="0.01" value={form.commissionValue} onChange={v => setForm(f => ({ ...f, commissionValue: v }))} />
            </Field>
          </div>
          {/* Aluguel de cadeira: modelo ADICIONAL, combinável com a comissão. */}
          <SwitchRow title="Cobrar aluguel de cadeira"
            description="O barbeiro paga um valor fixo pelo espaço. Pode somar com a comissão."
            checked={form.chairRentEnabled} onChange={v => setForm(f => ({ ...f, chairRentEnabled: v }))} />
          {form.chairRentEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor (R$)">
                <NumberField min={0} step="0.01" placeholder="0,00" value={form.chairRentAmount}
                  onChange={v => setForm(f => ({ ...f, chairRentAmount: v }))} required />
              </Field>
              <Select label="Cobrança" value={form.chairRentPeriod}
                onChange={e => setForm(f => ({ ...f, chairRentPeriod: +e.target.value }))}>
                <option value={0}>Semanal</option>
                <option value={1}>Mensal</option>
              </Select>
            </div>
          )}
        </fieldset>

        <SwitchRow title="Aparecer na página de agendamento"
          description="Desligado, o barbeiro continua no painel mas os clientes não podem escolhê-lo."
          checked={form.showInPublicPage} onChange={v => setForm(f => ({ ...f, showInPublicPage: v }))} />
      </form>
    </Modal>
  )
}
