import { useState } from 'react'
import { Copy, Check, ExternalLink, Link2 } from 'lucide-react'
import { useSettings } from '../../features/settings/settingsApi'
import { Button } from '../ui/glass/Button'
import toast from 'react-hot-toast'

/**
 * Link público da área do cliente (/b/{slug}) com botões Copiar e Abrir.
 * O domínio vem de window.location.origin — funciona em dev, preview e produção
 * sem configuração extra. Usado no Dashboard e em Configurações → Identidade.
 */
export function PublicLinkButtons({ compact = false }: { compact?: boolean } = {}) {
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

  // Versão compacta (rodapé da sidebar / "Mais" no mobile): ícone + link + botões
  // só de ícone. Na sidebar recolhida, só o ícone da esquerda fica visível.
  if (compact) {
    return (
      <div className="g-side-link">
        <span className="g-side-icon g-fg-3"><Link2 size={20} strokeWidth={1.75} /></span>
        <span className="g-side-label flex-1 min-w-0 truncate g-fg-2" title={url}
          style={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {url.replace(/^https?:\/\//, '')}
        </span>
        <span className="g-side-label flex items-center gap-0.5">
          <button type="button" className="g-icon-btn g-icon-btn--sm" onClick={copy}
            aria-label={copied ? 'Copiado!' : 'Copiar'} title={copied ? 'Copiado!' : 'Copiar'}
            style={copied ? { color: 'var(--success)' } : undefined}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button type="button" className="g-icon-btn g-icon-btn--sm" onClick={() => window.open(url, '_blank', 'noopener')}
            aria-label="Abrir" title="Abrir">
            <ExternalLink size={15} />
          </button>
        </span>
      </div>
    )
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
