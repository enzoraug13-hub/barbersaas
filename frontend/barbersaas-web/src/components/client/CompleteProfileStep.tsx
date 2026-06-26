import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, User } from 'lucide-react'
import { clientApi } from '../../lib/clientApi'
import { type ClientProfile } from '../../store/clientAuthStore'
import { Button } from '../ui/Button'
import { CpfField } from '../ui/CpfField'
import { ClientFlowHeader } from './PhoneOtpStep'
import { isValidCPF } from '../../lib/masks'
import toast from 'react-hot-toast'

function apiErrorMessage(e: any, fallback: string): string {
  if (e?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  return e?.response?.data?.errors?.[0] ?? e?.response?.data?.message ?? fallback
}

/* Completa o cadastro (só o que falta) — compartilhado entre "Minha conta" e
   o agendamento (cliente novo, depois do OTP). */
export function CompleteProfileStep({ client, logoUrl, businessName, subtitle, onDone }: {
  client: ClientProfile; logoUrl?: string; businessName?: string; subtitle?: string
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
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const submit = async () => {
    let hasError = false
    if (needsName && !name.trim()) { setNameError('Informe seu nome.'); hasError = true } else setNameError(null)
    if (needsCpf && !isValidCPF(cpfDigits)) { setCpfError('CPF inválido.'); hasError = true } else setCpfError(null)
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
      // O gate de "perfil completo" em ClientAccountPage lê o cache do
      // react-query (freshProfile), não o store — sem invalidar aqui o
      // cliente fica travado na tela mesmo depois de salvar com sucesso.
      await queryClient.invalidateQueries({ queryKey: ['client-me'] })
      toast.success('Perfil atualizado!')
    } catch (e: any) {
      toast.error(apiErrorMessage(e, 'Erro ao salvar perfil.'))
    } finally { setBusy(false) }
  }

  return (
    <div>
      <ClientFlowHeader logoUrl={logoUrl} businessName={businessName} subtitle={subtitle ?? 'Só falta completar seu cadastro.'} />
      <div className="ds-card space-y-4 animate-fade-in">
        {needsName && (
          <div className="ds-field">
            <label className="ds-label">Nome completo</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
              <input ref={nameRef} className={`ds-input pl-10 ${nameError ? 'ds-input-error' : ''}`} placeholder="Seu nome" value={name}
                onChange={e => setName(e.target.value)} />
            </div>
            {nameError && <span className="ds-error-text">{nameError}</span>}
          </div>
        )}
        {needsCpf && (
          <CpfField label="CPF" value={cpfDigits} onChange={setCpfDigits} error={cpfError ?? undefined} onEnter={submit} />
        )}
        <div className="ds-field">
          <label className="ds-label">E-mail (opcional)</label>
          <input type="email" className="ds-input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button onClick={submit} loading={busy} className="w-full">{!busy && <CheckCircle size={16} />} Concluir</Button>
      </div>
    </div>
  )
}
