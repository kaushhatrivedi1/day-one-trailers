import { useEffect, useRef } from 'react'

// Live waveform drawn from the mic analyser. Draws a quiet line when idle.
export default function Wave({ analyser, active }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const g = canvas.getContext('2d')
    let raf
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = () => {
      const { width: w, height: h } = canvas
      g.clearRect(0, 0, w, h)
      const node = analyser.current
      g.lineWidth = 3
      g.lineCap = 'round'
      const grad = g.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, '#FF6B9A'); grad.addColorStop(0.5, '#FFD25A'); grad.addColorStop(1, '#2FD3C0')
      g.strokeStyle = grad
      g.beginPath()
      if (node && active) {
        const buf = new Uint8Array(node.fftSize)
        node.getByteTimeDomainData(buf)
        const step = Math.floor(buf.length / 90)
        for (let i = 0; i < 90; i++) {
          const x = (i / 89) * w
          const y = h / 2 + ((buf[i * step] - 128) / 128) * (h * 0.9)
          i ? g.lineTo(x, y) : g.moveTo(x, y)
        }
      } else {
        g.moveTo(0, h / 2); g.lineTo(w, h / 2)
      }
      g.stroke()
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [analyser, active])
  return <canvas ref={ref} className="wave" width="900" height="120" role="img" aria-label={active ? 'Live microphone waveform' : 'Microphone is off'} />
}
