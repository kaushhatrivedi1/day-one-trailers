import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import { signText } from './api.js'
import { glossFrames } from './signs.js'
import { useAccess, useT } from './access.jsx'

// Sign-language window. The pipeline turns the line into ASL gloss; if the sign library covers it,
// the stitched video plays, otherwise Bolt signs the glosses he knows and fingerspells names.
// Either way the gloss is shown, so a viewer can see exactly what is (and isn't) signed.
export default function SignPanel({ text, className = '', size = 150 }) {
  const t = useT()
  const { lang } = useAccess()
  const [res, setRes] = useState(undefined)
  const [run, setRun] = useState(0)
  const [at, setAt] = useState(-1)

  useEffect(() => {
    let live = true
    setRes(undefined)
    signText(text, lang).then((r) => live && setRes(r || null))
    return () => { live = false }
  }, [text, lang])

  if (res === null) return null
  if (res === undefined) return <aside className={`signpanel ${className}`}><p className="sign-note">{t.signLoading}</p></aside>

  if (res.videoUrl) {
    return (
      <aside className={`signpanel ${className}`} aria-label={t.signWindow}>
        <video src={res.videoUrl} autoPlay muted loop playsInline aria-label={`${t.signGloss}: ${res.gloss.join(' ')}`} />
        <p className="sign-note">{t.signVideo}{res.credit ? ` ${res.credit}` : ''}</p>
      </aside>
    )
  }

  const { frames, signed } = glossFrames(res.gloss || [])
  return (
    <aside className={`signpanel bolt ${className}`} aria-label={t.signWindow}>
      {frames.length > 0 && (
        <Cleo size={size} pose="rest" expr="happy" lookAt={false} label={`${t.signGloss}: ${res.gloss.join(' ')}`}
          signing={{ key: `${text}#${run}`, frames: frames.map((f) => (f.pause ? f : { ...f, onEnter: () => setAt(f.gloss) })) }}
          onSignDone={() => setTimeout(() => setRun((r) => r + 1), 900)} />
      )}
      <p className="gloss" aria-label={t.signGloss}>
        {res.gloss.map((g, i) => <span key={i} className={i === at ? 'on now' : signed.includes(i) ? 'on' : ''}>{g}</span>)}
      </p>
      <p className="sign-note">{t.signPartial(signed.length, res.gloss.length)}</p>
    </aside>
  )
}
