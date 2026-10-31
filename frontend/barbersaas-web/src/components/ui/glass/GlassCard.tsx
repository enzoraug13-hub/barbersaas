import { forwardRef, type HTMLAttributes } from 'react'
import { cx } from './cx'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hover: sobe 2px e a borda clareia. Padrão: true. */
  hover?: boolean
  /** Padding padrão (20px mobile / 24px desktop). Padrão: true. */
  padded?: boolean
}

/** Superfície de vidro: branco ~4.5%, backdrop-blur-xl, borda branca 8%, raio 18px. */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ hover = true, padded = true, className, children, ...rest }, ref) => (
    <div ref={ref} className={cx('g-card', hover && 'g-card--hover', padded && 'g-card--pad', className)} {...rest}>
      {children}
    </div>
  ),
)
GlassCard.displayName = 'GlassCard'
