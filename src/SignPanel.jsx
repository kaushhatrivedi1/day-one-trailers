import { useEffect, useState } from 'react'
import { signText } from './api.js'
import { useAccess, useT } from './access.jsx'

// Sign-language window. The pipeline turns the line into ASL gloss and, when the sign library
// covers it, plays the stitched clip video. With no library the window stays hidden.
export default function SignPanel({ text, className = '', size = 150 }) {
  const t = useT()
  const { lang } = useAccess()
  const [res, setRes] = useState(undefined)

  useEffect(() => {
    let live = true
    setRes(undefined)
    signText(text, lang).then((r) => live && setRes(r || null))
    return () => { live = false }
  }, [text, lang])

  if (res === null) return null
  if (res === undefined) return null

  if (res.videoUrl) {
    return (
      <aside className={`signpanel ${className}`} aria-label={t.signWindow}>
        <video src={res.videoUrl} autoPlay muted loop playsInline aria-label={`${t.signGloss}: ${res.gloss.join(' ')}`} />
        <p className="sign-note">{t.signVideo}{res.credit ? ` ${res.credit}` : ''}</p>
      </aside>
    )
  }

  // No signed video: show nothing. Bolt's handful of signs plus a wall of gloss text is not ASL and
  // reads as broken. Captions stay on, and Bolt signs his own short host lines elsewhere.
  return null
}
