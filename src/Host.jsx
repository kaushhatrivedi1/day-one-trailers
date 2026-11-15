import { useEffect, useMemo, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import { handElements } from './hands.js'
import { framesFor } from './signs.js'
import { speak } from './speech.js'
import { useAccess, useT } from './access.jsx'
import { createElement } from 'react'

const render = (els) => els.map(([tag, a, kids], i) => createElement(tag, { key: i, ...Object.fromEntries(Object.entries(a).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])) }, kids ? render(kids) : undefined))

// A close-up of the hand so each shape is easy to see.
export function HandCloseup({ frame }) {
  if (!frame) return null
  const letter = frame.label && frame.label.length === 1
  return (
    <figure className="closeup" aria-label={letter ? `Handshape for the letter ${frame.label}` : `Handshape for ${frame.label}`}>
      <svg viewBox="-44 -44 88 96" width="120" height="130" aria-hidden="true"><g transform="scale(1.7)">{render(handElements(frame.rs))}</g></svg>
      <figcaption>{frame.label}</figcaption>
    </figure>
  )
}

// Bolt says a line, signs it, and shows the words. Calls onDone when both finish.
export default function HostLine({ line, size = 300, expr = 'happy', pose = 'rest', autoplay = true, onDone, children }) {
  const { sign, lang } = useAccess()
  const t = useT()
  // Parents often build `line` fresh on every render (e.g. HOST.ready(t)); key everything on the words,
  // or Bolt would start the line again each time the screen updates.
  const lineKey = line.text + '|' + JSON.stringify(line.tokens || [])
  const frames = useMemo(() => (sign ? framesFor(line.tokens || []) : []), [lineKey, sign]) // eslint-disable-line
  const [speaking, setSpeaking] = useState(false)
  const [signing, setSigning] = useState(null)
  const [frame, setFrame] = useState(null)
  const pending = useRef(0)
  const finished = useRef(false)
  const doneRef = useRef(onDone); doneRef.current = onDone

  useEffect(() => {
    if (!autoplay) return
    finished.current = false
    pending.current = frames.length ? 2 : 1
    const one = () => { pending.current -= 1; if (pending.current <= 0 && !finished.current) { finished.current = true; setSpeaking(false); setFrame(null); doneRef.current?.() } }
    const stop = speak(line.text, lang, { onStart: () => setSpeaking(true), onEnd: () => { setSpeaking(false); one() } })
    let timers = []
    if (frames.length) {
      setSigning({ key: line.text + Date.now(), frames })
      let at = 0
      frames.forEach((f) => { if (f.pause) { at += f.pause; return } timers.push(setTimeout(() => setFrame(f), at)); at += f.ms })
      timers.push(setTimeout(one, at + 250))
    }
    return () => { stop(); timers.forEach(clearTimeout); setSigning(null); setFrame(null) }
  }, [lineKey, frames, autoplay, lang]) // eslint-disable-line

  return (
    <div className="host">
      <div className="host-cleo">
        <Cleo size={size} expr={expr} pose={pose} speaking={speaking} signing={signing} />
      </div>
      <div className="host-say">
        <p className="host-caption" aria-live="polite">{line.text}</p>
        {sign && frames.length > 0 && <div className="closeup-slot">{frame && <HandCloseup frame={frame} />}</div>}
        {sign && frames.length > 0 && <p className="note">{t.hostSignNote}</p>}
        {children}
      </div>
    </div>
  )
}
