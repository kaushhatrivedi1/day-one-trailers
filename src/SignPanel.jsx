import { useEffect, useRef, useState } from 'react'
import { signText } from './api.js'
import { useAccess, useT } from './access.jsx'

// Sign-language window. The pipeline translates the line into ASL gloss using only signs in the
// local sign library, then plays the joined clips of a real signer. With no library (or too little
// coverage) the window stays hidden instead of faking it.
//   onReady(hasVideo)  tells the player whether to wait for the signing
//   onEnded()          fires once when the signed line has played through
export default function SignPanel({ text, className = '', loop = false, onReady, onEnded }) {
  const t = useT()
  const { lang } = useAccess()
  const [res, setRes] = useState(undefined)
  const ended = useRef(false)
  const cb = useRef({ onReady, onEnded })
  cb.current = { onReady, onEnded }

  useEffect(() => {
    let live = true
    setRes(undefined)
    ended.current = false
    signText(text, lang).then((r) => {
      if (!live) return
      setRes(r || null)
      cb.current.onReady?.(!!r?.videoUrl)
    })
    return () => { live = false }
  }, [text, lang])

  if (!res?.videoUrl) return null
  const finish = () => { if (!ended.current) { ended.current = true; cb.current.onEnded?.() } }

  return (
    <aside className={`signpanel ${className}`} aria-label={t.signWindow}>
      <video key={res.videoUrl} src={res.videoUrl} autoPlay muted playsInline loop={loop}
        onEnded={finish} onError={finish}
        onTimeUpdate={(e) => { if (loop && e.currentTarget.currentTime >= e.currentTarget.duration - 0.2) finish() }}
        aria-label={`${t.signGloss}: ${res.gloss.join(' ')}`} />
      <p className="gloss" aria-hidden="true">{res.gloss.join(' ')}</p>
      {res.credit && <p className="sign-note">{res.credit}</p>}
    </aside>
  )
}
