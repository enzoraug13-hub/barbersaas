/**
 * Fundo ambiente: canvas escuro + manchas de cor desfocadas (dourado, cobre e
 * um azul-petróleo de contraste),
 * derivando bem devagar (só transform; parado sob prefers-reduced-motion),
 * mais um granulado leve contra "banding". Fixo atrás de tudo, decorativo.
 */
export function AmbientBackground() {
  return (
    <div className="g-ambient" aria-hidden="true">
      <div className="g-ambient-blob g-ambient-blob--1" />
      <div className="g-ambient-blob g-ambient-blob--2" />
      <div className="g-ambient-blob g-ambient-blob--3" />
      <div className="g-ambient-blob g-ambient-blob--4" />
      <div className="g-ambient-vignette" />
      <div className="g-ambient-grain" />
    </div>
  )
}
