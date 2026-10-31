import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { DUR, EASE, STAGGER } from '../../motion/tokens'
import { useStaggerItemVariants } from '../../motion/variants'
import { cx } from './cx'

/** Tabela de vidro com rolagem horizontal no mobile. */
export function Table({ className, children, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="g-table-wrap">
      <table className={cx('g-table', className)} {...rest}>{children}</table>
    </div>
  )
}

export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />
export const TH = (p: ThHTMLAttributes<HTMLTableCellElement>) => <th {...p} />
export const TD = (p: TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} />

/** <tbody> que revela as linhas <TR> em sequência na montagem. */
export function TBody({ children, ...rest }: HTMLMotionProps<'tbody'>) {
  const reduce = useReducedMotion()
  return (
    <motion.tbody
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : STAGGER * 0.8 } } }}
      {...rest}
    >
      {children}
    </motion.tbody>
  )
}

/** Linha com entrada em fade + y (herda o stagger do <TBody>). */
export function TR({ children, ...rest }: HTMLMotionProps<'tr'>) {
  const variants = useStaggerItemVariants()
  return <motion.tr variants={variants} transition={{ duration: DUR.item, ease: EASE }} {...rest}>{children}</motion.tr>
}
