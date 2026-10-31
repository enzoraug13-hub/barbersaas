/**
 * Fundo ambiente: canvas escuro + 3 manchas de cor quentes e desfocadas,
 * derivando bem devagar (só transform; parado sob prefers-reduced-motion),
 * mais um granulado leve contra "banding". Fixo atrás de tudo, decorativo.
 */
export function AmbientBackground() {
  return (
    <div className="g-ambient" aria-hidden="true">
      <div className="g-ambient-blob g-ambient-blob--1" />
      <div className="g-ambient-blob g-ambient-blob--2" />
      <div className="g-ambient-blob g-ambient-blob--3" />
      <div className="g-ambient-grain" />
    </div>
  )
}
