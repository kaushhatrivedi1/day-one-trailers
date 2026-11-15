import { useEffect, useRef, useState } from 'react'
import Bolt from './Outfit.jsx'
import SignPanel from './SignPanel.jsx'
import { speak } from './speech.js'
import { useAccess, useT } from './access.jsx'
import { signText } from './api.js'

// Trailer bookends. Cold open: brand-coloured light rays, the company logo on a glowing card, the
// title letter by letter, the role and "starring Bolt". End card: logo, title, "Directed by you".
// Both run on CSS animation and call onDone when finished (immediately with reduced motion).
const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Letters({ text }) {
  let i = 0
  // Letters animate one by one, but each word stays on one line.
  return (
    <span className="tc-letters" aria-label={text}>
      {text.split(' ').map((w, k) => (
        // Words are inline-block boxes, which swallow plain spaces; the gap comes from CSS margin.
        <span key={k} className="tc-word" aria-hidden="true">
          {[...w].map((ch) => <span key={i} style={{ '--i': i++ }}>{ch}</span>)}
        </span>
      ))}
    </span>
  )
}

// The cold open: black while the curtains part, then the title over brand-coloured rays; the
// title lifts away and Bolt (in the outfit the viewer picked) walks on, says hi and signs it,
// then the first scene starts. No separate intro screen.
export function ColdOpen({ company, role, logo, brand, outfit, onDone }) {
  const t = useT()
  const { lang, sign } = useAccess()
  const [beat, setBeat] = useState(reduce() ? 2 : 0) // 0 black, 1 title, 2 Bolt on stage
  const [word, setWord] = useState(-1)
  const [talking, setTalking] = useState(false)
  const line = t.hostIntro(role)
  const words = line.split(/\s+/)
  const left = useRef({ voice: true, sign: sign })
  const done = useRef(false)
  const finish = () => { if (!done.current) { done.current = true; setTimeout(onDone, 600) } }
  // Bolt says hi only once his signing has arrived (or after 6 s), so voice, captions and signs start together.
  const [signed, setSigned] = useState(!sign)
  const voiceRate = useRef(1)
  useEffect(() => { if (sign) signText(line, lang) }, []) // eslint-disable-line -- fetch during the title
  useEffect(() => {
    if (signed || beat !== 2) return
    const id = setTimeout(() => setSigned(true), 6000)
    return () => clearTimeout(id)
  }, [signed, beat])
  const check = () => { if (!left.current.voice && !left.current.sign) finish() }
  useEffect(() => {
    const a = setTimeout(() => setBeat(1), reduce() ? 0 : 1300)
    const b = setTimeout(() => setBeat(2), reduce() ? 0 : 4300)
    const cap = setTimeout(finish, 16000) // never hold the trailer for long
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(cap) }
  }, []) // eslint-disable-line
  useEffect(() => {
    if (beat !== 2 || !signed) return
    let stop
    const go = setTimeout(() => {
      stop = speak(line, lang, {
        rate: voiceRate.current,
        onStart: () => setTalking(true), onWord: setWord,
        onEnd: () => { setTalking(false); setWord(words.length); left.current.voice = false; check() },
      })
    }, reduce() ? 0 : sign ? 300 : 1600) // with signing on, speak as soon as the signing starts
    return () => { clearTimeout(go); stop?.() }
  }, [beat, signed]) // eslint-disable-line
  const title = company ? t.dayAt(company) : t.dayAs(role)
  if (beat === 0) return <div className="titlecard cold" aria-hidden="true" />
  return (
    <div className={`titlecard cold beat${beat}`} style={brand ? { '--brand': brand } : undefined} role="img" aria-label={`${title}. ${role}. ${line}`}>
      <div className="tc-rays" aria-hidden="true" />
      <div className="tc-body">
        {logo ? <div className="tc-logo"><img src={logo} alt="" /></div> : <div className="tc-mark" aria-hidden="true">D1</div>}
        <h2 className="tc-title"><Letters text={title.toUpperCase()} /></h2>
        {company && role && <p className="tc-role">{role}</p>}
        <p className="tc-star">{t.starring}</p>
      </div>
      <div className="tc-flare" aria-hidden="true" />
      {beat === 2 && (
        <>
          <div className="tc-floor" aria-hidden="true" /><div className="tc-spot" aria-hidden="true" />
          <div className="tc-bolt" aria-hidden="true"><div className="tc-gait"><Bolt outfit={outfit} size={230} pose={talking ? 'wave' : 'rest'} expr={talking ? 'cheer' : 'happy'} speaking={talking} lookAt={false} label="" /></div></div>
          <p className="tc-sub" aria-hidden="true">{words.map((w, k) => <span key={k} className={k <= word ? 'said' : ''}>{w} </span>)}</p>
          {sign && <SignPanel text={line} className="in-player" size={160} speakSecs={words.length * 0.38}
            onReady={(has, rates) => { voiceRate.current = has ? rates.voice : 1; setSigned(true); if (!has) { left.current.sign = false; check() } }}
            onEnded={() => { left.current.sign = false; check() }} />}
        </>
      )}
    </div>
  )
}

export function EndCard({ company, role, logo, brand, onDone }) {
  const t = useT()
  useEffect(() => { const id = setTimeout(onDone, reduce() ? 300 : 3600); return () => clearTimeout(id) }, []) // eslint-disable-line
  const title = company ? t.dayAt(company) : t.dayAs(role)
  return (
    <div className="titlecard end" style={brand ? { '--brand': brand } : undefined} role="img" aria-label={title}>
      <div className="tc-rays" aria-hidden="true" />
      <div className="tc-body">
        {logo && <div className="tc-logo small"><img src={logo} alt="" /></div>}
        <h2 className="tc-title small">{title.toUpperCase()}</h2>
        <p className="tc-star">{t.directedBy}</p>
        <p className="tc-next">{t.readyAsk}</p>
      </div>
    </div>
  )
}
