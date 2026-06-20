import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  panelClassName?: string
  panelStyle?: React.CSSProperties
}

export function Modal({ isOpen, onClose, title, subtitle, children, footer, panelClassName = '', panelStyle }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="ds-modal-backdrop" onClick={onClose}>
      <div className={`ds-modal-panel ${panelClassName}`} style={panelStyle} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="ds-modal-header">
            <div>
              <h3 className="ds-modal-title">{title}</h3>
              {subtitle && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} className="ds-modal-close" aria-label="Fechar"><X size={20} /></button>
          </div>
        )}
        {children}
        {footer && <div style={{ marginTop: 'var(--space-6)' }}>{footer}</div>}
      </div>
    </div>
  )
}
