import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { useSettings } from '../../features/settings/settingsApi'
import { Button } from '../ui/Button'
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
    <div className="flex items-center gap-2 flex-wrap"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)' }}>
      <span className="truncate" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'monospace', maxWidth: 280 }} title={url}>
        {url}
      </span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" onClick={copy}
          style={{ height: 30, padding: '0 var(--space-3)', fontSize: 'var(--text-xs)', color: copied ? 'var(--color-success)' : undefined }}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado!' : 'Copiar'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => window.open(url, '_blank', 'noopener')}
          style={{ height: 30, padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' }}>
          <ExternalLink size={13} /> Abrir
        </Button>
      </div>
    </div>
  )
}
