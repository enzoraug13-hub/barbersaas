import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { clientApi } from '../../lib/clientApi'
import { type ClientProfile } from '../../store/clientAuthStore'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CpfField } from '../ui/CpfField'
import { ClientFlowHeader } from './PhoneOtpStep'
import { isValidCPF } from '../../lib/masks'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

/* Completa o cadastro (só o que falta) — em "Minha conta" e no agendamento
   (cliente novo, depois do código). */
export function CompleteProfileStep({ client, logoUrl, businessName, subtitle, onDone, compact }: {
  client: ClientProfile; logoUrl?: string; businessName?: string; subtitle?: string; compact?: boolean
  onDone: (patch: Partial<ClientProfile>) => void
}) {
  const queryClient = useQueryClient()
  const needsName = !client.name?.trim()
  const needsCpf = !client.cpf?.trim()
  const [name, setName] = useState(client.name ?? '')
  const [cpfDigits, setCpfDigits] = useState('')
  const [email, setEmail] = useState(client.email ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    let hasError = false
    if (needsName && !name.trim()) { setNameError('Informe seu nome.'); hasError = true } else setNameError(null)
    if (needsCpf && !isValidCPF(cpfDigits)) { setCpfError('CPF inválido. Confira os números.'); hasError = true } else setCpfError(null)
    if (hasError) return

    setBusy(true)
    try {
      await clientApi.put('/client/me', {
        name: needsName ? name.trim() : undefined,
        cpf: needsCpf ? cpfDigits : undefined,
        email: email.trim() || undefined,
      })
      onDone({
        name: needsName ? name.trim() : client.name,
        cpf: needsCpf ? cpfDigits : client.cpf,
        email: email.trim() || client.email,
      })
      // O "perfil completo" em ClientAccountPage lê o cache do react-query:
      // sem invalidar, o cliente ficaria preso nesta tela depois de salvar.
      await queryClient.invalidateQueries({ queryKey: ['client-me'] })
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível salvar seus dados.'))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <ClientFlowHeader compact={compact} logoUrl={logoUrl} businessName={businessName} title={compact ? 'Seus dados' : undefined}
        subtitle={subtitle ?? 'Só falta completar seu cadastro.'} />
      <form onSubmit={e => { e.preventDefault(); submit() }} className="ds-panel ds-panel-pad space-y-4">
        {needsName && (
          <Input label="Nome completo" autoComplete="name" value={name} autoFocus
            onChange={e => setName(e.target.value)} error={nameError} />
        )}
        {needsCpf && (
          <CpfField label="CPF" value={cpfDigits} onChange={setCpfDigits} error={cpfError ?? undefined} onEnter={submit} />
        )}
        <Input label="E-mail" optional type="email" autoComplete="email" placeholder="voce@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Button type="submit" size="lg" block loading={busy}>Continuar</Button>
      </form>
    </div>
  )
}
