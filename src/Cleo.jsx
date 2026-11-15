import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { cleoElements, POSES, VIEWBOX } from './cleo.js'

const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const render = (els) => els.map(([tag, attrs, kids], i) => createElement(tag, { key: i, ...Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])) }, kids ? render(kids) : undefined))
const lerp = (a, b, t) => a + (b - a) * t

// Bolt, the host. Props:
//  expr: happy | think | surprised | caring | cheer      pose: a name from POSES
//  viseme: a Polly viseme name (live lip-sync)           speaking: true to animate the mouth when no visemes exist
//  signing: { key, frames } plays keyframes then returns to the pose
//  lookAt: eyes follow the pointer
export default function Cleo({ size = 260, expr = 'happy', pose = 'rest', viseme, speaking = false, signing, lookAt = true, label = 'Bolt, your Day One host', onSignDone }) {
  const wrap = useRef(null)
  const [blink, setBlink] = useState(false)
  const [gaze, setGaze] = useState(null)
  const [pseudo, setPseudo] = useState('rest')
  const [logo, setLogo] = useState(null)
  useEffect(() => { const im = new Image(); im.onload = () => setLogo('/sunhacks-logo.png'); im.src = '/sunhacks-logo.png' }, [])
  const target = useRef({ ...POSES.rest, ...POSES[pose] })
  const cur = useRef({ ...target.current })
  const [view, setView] = useState({ ...cur.current })
  const done = useRef(onSignDone)
  done.current = onSignDone

  // move toward the named pose
  useEffect(() => { target.current = { ...POSES.rest, ...POSES[pose] } }, [pose])

  // smooth movement
  useEffect(() => {
    let raf, last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const k = reduce() ? 1 : 1 - Math.exp(-dt * 14)
      const c = cur.current, t = target.current
      const next = { ...t }
      for (const key of ['rw', 'lw']) next[key] = [lerp(c[key][0], t[key][0], k), lerp(c[key][1], t[key][1], k)]
      for (const key of ['rr', 'lr']) next[key] = lerp(c[key], t[key], k)
      cur.current = next
      setView(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // sign playback
  useEffect(() => {
    if (!signing?.frames?.length) return
    let cancelled = false
    const timers = []
    let at = 0
    const base = { ...POSES.rest }
    signing.frames.forEach((f) => {
      if (f.pause) { at += f.pause; return }
      timers.push(setTimeout(() => {
        if (cancelled) return
        target.current = { ...base, rw: f.rw, rs: f.rs, rr: f.rr, lw: f.lw || base.lw, ls: f.ls || base.ls, lr: f.lr ?? base.lr }
        f.onEnter?.()
      }, at))
      at += f.ms
    })
    timers.push(setTimeout(() => { if (!cancelled) { target.current = { ...POSES.rest, ...POSES[pose] }; done.current?.() } }, at + 200))
    return () => { cancelled = true; timers.forEach(clearTimeout) }
  }, [signing?.key]) // eslint-disable-line

  // blink
  useEffect(() => {
    if (reduce()) return
    let t
    const go = () => { setBlink(true); setTimeout(() => setBlink(false), 110); t = setTimeout(go, 2200 + Math.random() * 2800) }
    t = setTimeout(go, 1400)
    return () => clearTimeout(t)
  }, [])

  // eyes follow the pointer
  useEffect(() => {
    if (!lookAt || reduce()) return
    const move = (e) => {
      const r = wrap.current?.getBoundingClientRect(); if (!r) return
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.3)
      const d = Math.hypot(dx, dy) || 1
      const m = Math.min(1, d / 260)
      setGaze([(dx / d) * 3.2 * m, (dy / d) * 3 * m])
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [lookAt])

  // pretend lip-sync when there are no visemes
  useEffect(() => {
    if (!speaking || viseme) { setPseudo('rest'); return }
    const shapes = ['open', 'wide', 'round', 'closed', 'open', 'wide', 'teeth']
    let i = 0
    const t = setInterval(() => { i = (i + 1 + Math.floor(Math.random() * 2)) % shapes.length; setPseudo(shapes[i]) }, 120)
    return () => clearInterval(t)
  }, [speaking, viseme])

  const els = useMemo(() => cleoElements({ expr, viseme, mouth: !viseme && speaking ? pseudo : undefined, blink, gaze: gaze || undefined, pose: view, logo }), [logo, expr, viseme, speaking, pseudo, blink, gaze, view])
  return (
    <svg ref={wrap} role="img" aria-label={label} viewBox={VIEWBOX} width={size} height={(size * 326) / 300} className="cleo" style={{ overflow: 'visible' }}>
      {render(els)}
    </svg>
  )
}
