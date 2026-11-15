import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import { signText } from './api.js'
import { useAccess, useT } from './access.jsx'

// Sign-language window: Bolt signs the line. The pipeline translates it into ASL gloss using signs
// from the local library, checks the meaning blind, and sends the motion of a real native signer
// (captured from ASLLVD clips) for Bolt to perform. With no motion, the window stays hidden.
//   onReady(hasSigning)  tells the player whether to wait for the signing
//   onEnded()            fires once when the line has been signed through
// Recorded signing runs ~1.8x longer than the spoken line. Meet in the middle: sign up to 1.4x faster
// and slow the voice by up to 12%, so the two finish close together without looking rushed.
export function syncRates(signSecs, speakSecs) {
  if (!signSecs || !speakSecs) return { sign: 1, voice: 1 }
  const sign = Math.min(1.4, Math.max(1, signSecs / speakSecs))
  const voice = Math.min(1, Math.max(0.88, speakSecs / (signSecs / sign)))
  return { sign, voice }
}

export default function SignPanel({ text, className = '', loop = false, size = 150, simple = false, gloss = null, speakSecs = 0, onReady, onEnded }) {
  const t = useT()
  const { lang } = useAccess()
  const [res, setRes] = useState(undefined)
  const [run, setRun] = useState(0)
  const ended = useRef(false)
  const cb = useRef({ onReady, onEnded })
  cb.current = { onReady, onEnded }

  useEffect(() => {
    let live = true
    setRes(undefined)
    setRun(0)
    ended.current = false
    signText(text, lang, simple, gloss).then((r) => {
      if (!live) return
      setRes(r || null)
      const f = r?.motion?.frames
      const rates = syncRates(f?.length ? f[f.length - 1].t - f[0].t : 0, speakSecs)
      cb.current.onReady?.(!!(f?.length || r?.videoUrl), rates)
    })
    return () => { live = false }
  }, [text, lang])

  const finish = () => {
    if (!ended.current) { ended.current = true; cb.current.onEnded?.() }
    if (loop) setTimeout(() => setRun((n) => n + 1), 1500)
  }

  if (res?.motion?.frames?.length) {
    return (
      <aside className={`signpanel bolt-signer ${className}`} aria-label={t.signWindow}>
        <Cleo size={size} closeUp expr="happy" lookAt={false} label={`${t.signGloss}: ${res.gloss.join(' ')}`}
          motion={{ key: `${text}#${run}`, frames: res.motion.frames, speed: syncRates(res.motion.frames[res.motion.frames.length - 1].t - res.motion.frames[0].t, speakSecs).sign }} onSignDone={finish} />
        <p className="gloss" aria-hidden="true">{res.gloss.join(' ')}</p>
        <p className="sign-note">ASL motion: ASLLVD, Boston Univ.</p>
      </aside>
    )
  }

  if (res?.videoUrl) {
    return (
      <aside className={`signpanel ${className}`} aria-label={t.signWindow}>
        <video key={res.videoUrl} src={res.videoUrl} autoPlay muted playsInline loop={loop}
          onEnded={finish} onError={finish} aria-label={`${t.signGloss}: ${res.gloss.join(' ')}`} />
        <p className="gloss" aria-hidden="true">{res.gloss.join(' ')}</p>
        <p className="sign-note">ASL: ASLLVD, Boston Univ.</p>
      </aside>
    )
  }
  return null
}
