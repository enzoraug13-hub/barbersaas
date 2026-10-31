import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { DUR, EASE } from '../../motion/tokens'
import { useOverlayBehavior } from './overlay'
import { cx } from './cx'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  side?: 'right' | 'left' | 'bottom'
  children: ReactNode
  footer?: ReactNode
  className?: string
}

const offscreen = {
  right: { x: '104%' },
  left: { x: '-104%' },
  bottom: { y: '100%' },
} as const

/** Painel lateral (ou bottom sheet no mobile) de vidro, com fundo desfocado. */
export function Drawer({ isOpen, onClose, title, side = 'right', children, footer, className }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useOverlayBehavior(isOpen, onClose, ref)

  const hidden = reduce ? { opacity: 0 } : { ...offscreen[side], opacity: 0.6 }
  const shown = reduce ? { opacity: 1 } : { x: 0, y: 0, opacity: 1 }
  const transition = reduce ? { duration: DUR.reduced } : { duration: DUR.page + 0.05, ease: EASE }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="g-drawer-backdrop" className="g-overlay" onClick={onClose} aria-hidden="true"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR.base }} />
          <motion.aside
            key="g-drawer-panel"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cx('g-drawer', `g-drawer--${side}`, className)}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={transition}
          >
            {title && (
              <div className="g-drawer-header">
                <h3 className="g-modal-title">{title}</h3>
                <button type="button" onClick={onClose} className="g-icon-btn" aria-label="Fechar"><X size={18} /></button>
              </div>
            )}
            <div className="g-drawer-body">{children}</div>
            {footer && <div className="g-drawer-footer">{footer}</div>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
