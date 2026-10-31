import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useSettings } from '../../features/settings/settingsApi'
import { Button } from '../ui/glass/Button'
import toast from 'react-hot-toast'

/**
 * Link público da área do cliente (/b/{slug}) com botões Copiar e Abrir.
 * O domínio vem de window.location.origin — funciona em dev, preview e produção
 * sem configuração extra. Usado no Dashboard e em Configurações → Identidade.
 */
export function PublicLinkButtons() {
  const { data: settings } = useSettings()
  const [copied, setCopied] = useState(false)

  if (!settings?.publicSlug) return null
  const url = `${window.location.origin}/b/${settings.publicSlug}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.')
    }
  }

  return (
    <div className="g-linkbar max-w-full">
      <span className="truncate g-fg-2" style={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', maxWidth: 280 }} title={url}>
        {url}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={copy}
          style={copied ? { color: 'var(--g-success)' } : undefined}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado!' : 'Copiar'}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.open(url, '_blank', 'noopener')}>
          <ExternalLink size={13} /> Abrir
        </Button>
      </div>
    </div>
  )
}
