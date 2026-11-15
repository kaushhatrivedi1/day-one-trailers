import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import { signText } from './api.js'
import { useAccess, useT } from './access.jsx'

// Sign-language window: Bolt signs the line. The pipeline translates it into ASL gloss using signs
// from the local library, checks the meaning blind, and sends the motion of a real native signer
// (captured from ASLLVD clips) for Bolt to perform. With no motion, the window stays hidden.
//   onReady(hasSigning)  tells the player whether to wait for the signing
//   onEnded()            fires once when the line has been signed through
export default function SignPanel({ text, className = '', loop = false, size = 150, onReady, onEnded }) {
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
    signText(text, lang).then((r) => {
      if (!live) return
      setRes(r || null)
      cb.current.onReady?.(!!(r?.motion?.frames?.length || r?.videoUrl))
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
          motion={{ key: `${text}#${run}`, frames: res.motion.frames }} onSignDone={finish} />
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
