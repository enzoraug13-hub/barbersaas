/**
 * Fundo ambiente: canvas escuro + manchas de cor desfocadas (dourado, cobre e
 * um azul-petróleo de contraste), vinheta e granulado leve contra "banding".
 * Estático (fundo animado faria todo vidro recalcular o blur a cada frame).
 * Fixo atrás de tudo, decorativo.
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
