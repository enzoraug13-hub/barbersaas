import { useState } from 'react'
import { Copy, Check, ExternalLink, Share2 } from 'lucide-react'
import { useSettings } from '../../features/settings/settingsApi'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'

/**
 * Link público de agendamento (/b/{slug}): copiar, compartilhar (celular) e abrir.
 * O domínio vem de window.location.origin — funciona em dev, preview e produção.
 */
export function PublicLinkButtons({ compact }: { compact?: boolean }) {
  const { data: settings } = useSettings()
  const [copied, setCopied] = useState(false)

  if (!settings?.publicSlug) return null
  const url = `${window.location.origin}/b/${settings.publicSlug}`
  const display = url.replace(/^https?:\/\//, '')
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copiado.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.')
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: settings.businessName, text: `Agende seu horário na ${settings.businessName}`, url })
    } catch { /* cancelado pelo usuário */ }
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
      <input readOnly value={display} aria-label="Link de agendamento"
        className="ds-input flex-1 min-w-0 text-ink-2" style={{ minWidth: 0 }}
        onFocus={e => e.currentTarget.select()} />
      <Button variant="secondary" onClick={copy} aria-label="Copiar link">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
      </Button>
      {canShare
        ? <Button variant="secondary" icon onClick={share} aria-label="Compartilhar link"><Share2 size={16} /></Button>
        : <Button variant="secondary" icon onClick={() => window.open(url, '_blank', 'noopener')} aria-label="Abrir página"><ExternalLink size={16} /></Button>}
    </div>
  )
}
