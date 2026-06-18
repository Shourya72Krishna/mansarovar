import { useEffect, useRef } from 'react'

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Stars
    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = []
    for (let i = 0; i < 220; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 0.008 + 0.002,
      })
    }

    let frame = 0
    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      // Nebula blobs
      const blobs = [
        { x: canvas.width * 0.15, y: canvas.height * 0.3, r: 320, color: '124,58,237', alpha: 0.045 },
        { x: canvas.width * 0.8, y: canvas.height * 0.2, r: 280, color: '37,99,235', alpha: 0.04 },
        { x: canvas.width * 0.5, y: canvas.height * 0.75, r: 350, color: '13,148,136', alpha: 0.03 },
        { x: canvas.width * 0.9, y: canvas.height * 0.7, r: 200, color: '217,119,6', alpha: 0.025 },
      ]
      blobs.forEach(b => {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        grad.addColorStop(0, `rgba(${b.color},${b.alpha})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Stars
      stars.forEach(s => {
        const flicker = Math.sin(frame * s.speed + s.x) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * flicker})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  )
}
