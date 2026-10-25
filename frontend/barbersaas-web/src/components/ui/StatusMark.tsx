import { CircleCheck } from 'lucide-react'
import { Pill } from './Badge'
import { statusOf } from '../../lib/format'

/* Status de agendamento em listas: só marca o que foge do normal.
   Confirmado é o estado esperado (sem etiqueta); concluído vira um ✓;
   pendente, cancelado e falta aparecem por extenso. */
export function StatusMark({ status }: { status: string }) {
  if (status === 'Confirmed') return null
  if (status === 'Completed') {
    return <CircleCheck size={18} strokeWidth={2} className="text-ok flex-shrink-0" aria-label="Concluído" role="img" />
  }
  const st = statusOf(status)
  return <Pill tone={st.tone}>{st.label}</Pill>
}
