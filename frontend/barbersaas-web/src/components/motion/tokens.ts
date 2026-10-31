// Tokens de movimento — espelham as variáveis --g-ease / --g-dur-* de tokens.css.
// Regra: animar só transform / opacity / filter.

/** Ease "out-expo" suave usado em todo o app. */
export const EASE = [0.22, 1, 0.36, 1] as const

/** Durações em segundos (framer-motion). */
export const DUR = {
  micro: 0.15,
  base: 0.25,
  pageExit: 0.22,
  page: 0.35,
  item: 0.45,
  chart: 0.9,
  count: 1,
  reduced: 0.15,
} as const

/** Intervalo entre filhos em listas/grades. */
export const STAGGER = 0.05
