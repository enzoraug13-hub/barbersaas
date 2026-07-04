import { useEffect, useRef } from 'react'

/* Chuva atmosférica num único <canvas> — nada de milhares de nós no DOM.
   ~110 traços finos redesenhados por frame via requestAnimationFrame (que já
   pausa sozinho em aba oculta). Respeita prefers-reduced-motion: não anima.
   Decorativo puro: aria-hidden e pointer-events none. */
export function RainCanvas({ density = 110 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    type Drop = { x: number; y: number; len: number; speed: number; alpha: number; drift: number }
    // Gotas finas, discretas, com leve inclinação pelo "vento".
    const spawn = (): Drop => ({
      x: rand(-30, w + 60),
      y: rand(-h * 0.3, -10),
      len: rand(9, 22),
      speed: rand(340, 640),
      alpha: rand(0.05, 0.16),
      drift: rand(-70, -30),
    })
    const drops: Drop[] = Array.from({ length: density }, () => ({ ...spawn(), y: rand(0, h) }))

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1
      ctx.lineCap = 'round'
      for (const d of drops) {
        d.y += d.speed * dt
        d.x += d.drift * dt
        if (d.y - d.len > h + 10) Object.assign(d, spawn())
        const k = d.len / d.speed // traço na direção do movimento
        ctx.strokeStyle = `rgba(205,218,236,${d.alpha})`
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.drift * k, d.y - d.len)
        ctx.stroke()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [density])

  return (
    <canvas ref={ref} aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full" />
  )
}
