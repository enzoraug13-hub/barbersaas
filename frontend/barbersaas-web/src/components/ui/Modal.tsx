import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  /** Ações (botões). Para enviar um <form> do corpo, use form="id" no botão. */
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  /** No mobile, empilha os botões do rodapé (ações longas). */
  stackFooter?: boolean
}

/* Diálogo no desktop, folha inferior no mobile (mesmo componente, via CSS).
   Renderiza em portal no <body> (escapa de qualquer stacking context), trava a
   rolagem do fundo, fecha no Esc e no clique fora, e devolve o foco a quem abriu. */
export function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md', stackFooter }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Esc fecha (listener refeito quando onClose muda — barato e sem ref em render).
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Abrir: trava a rolagem do fundo, foca o primeiro campo; fechar: devolve o foco.
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const first = panel.querySelector<HTMLElement>('.ds-dialog-body input:not([type=hidden]):not([disabled]):not([readonly]), .ds-dialog-body select, .ds-dialog-body textarea')
      ;(first ?? panel).focus({ preventScroll: true })
    })
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.({ preventScroll: true })
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="ds-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`ds-dialog ${size !== 'md' ? `ds-dialog-${size}` : ''}`} style={{ outline: 'none' }}>
        {title && (
          <div className="ds-dialog-head">
            <div className="min-w-0">
              <h2 className="ds-dialog-title">{title}</h2>
              {subtitle && <p className="ds-dialog-sub">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost ds-btn-icon ds-btn-sm -mr-2 -mt-1" aria-label="Fechar">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="ds-dialog-body">{children}</div>
        {footer && <div className={`ds-dialog-foot ${stackFooter ? 'ds-stack' : ''}`}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
