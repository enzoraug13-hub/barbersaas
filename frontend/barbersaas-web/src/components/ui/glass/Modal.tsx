import { useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { X } from 'lucide-react'
import { DUR, EASE } from '../../motion/tokens'
import { useOverlayBehavior } from './overlay'
import { cx } from './cx'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  panelClassName?: string
  panelStyle?: CSSProperties
}

const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base } },
  exit: { opacity: 0, transition: { duration: DUR.base } },
}
const panel: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: 'blur(6px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: DUR.page, ease: EASE }, transitionEnd: { filter: 'none' } },
  exit: { opacity: 0, scale: 0.97, filter: 'blur(4px)', transition: { duration: DUR.micro + 0.05, ease: EASE } },
}
const panelReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.reduced } },
  exit: { opacity: 0, transition: { duration: DUR.reduced } },
}

/**
 * Modal de vidro (mesma API do Modal legado): entra com scale .96→1 + fade,
 * fundo desfocado. Renderiza em portal no <body> — nunca fica preso dentro de
 * um card com transform/backdrop-filter.
 */
export function Modal({ isOpen, onClose, title, subtitle, children, footer, panelClassName, panelStyle }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useOverlayBehavior(isOpen, onClose, ref)

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="g-modal-backdrop" className="g-overlay" variants={backdrop}
            initial="hidden" animate="show" exit="exit" onClick={onClose} aria-hidden="true" />
          <div className="g-modal-viewport">
            <motion.div
              key="g-modal-panel"
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
              className={cx('g-modal', panelClassName)}
              style={panelStyle}
              variants={reduce ? panelReduced : panel}
              initial="hidden" animate="show" exit="exit"
            >
              {title && (
                <div className="g-modal-header">
                  <div>
                    <h3 className="g-modal-title">{title}</h3>
                    {subtitle && <p className="g-modal-sub">{subtitle}</p>}
                  </div>
                  <button type="button" onClick={onClose} className="g-icon-btn" aria-label="Fechar"><X size={18} /></button>
                </div>
              )}
              {children}
              {footer && <div className="g-modal-footer">{footer}</div>}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
