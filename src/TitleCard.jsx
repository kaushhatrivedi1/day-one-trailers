import { useEffect, useState } from 'react'
import { useT } from './access.jsx'

// Trailer bookends. Cold open: brand-coloured light rays, the company logo on a glowing card, the
// title letter by letter, the role and "starring Bolt". End card: logo, title, "Directed by you".
// Both run on CSS animation and call onDone when finished (immediately with reduced motion).
const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Letters({ text }) {
  return (
    <span className="tc-letters" aria-label={text}>
      {[...text].map((ch, i) => <span key={i} aria-hidden="true" style={{ '--i': i }}>{ch === ' ' ? ' ' : ch}</span>)}
    </span>
  )
}

// The cold open waits on black until the curtains have opened (about 1.3 s), then plays.
export function ColdOpen({ company, role, logo, brand, onDone }) {
  const t = useT()
  const [go, setGo] = useState(reduce())
  useEffect(() => {
    const a = setTimeout(() => setGo(true), reduce() ? 0 : 1300)
    const b = setTimeout(onDone, reduce() ? 300 : 1300 + 4600)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, []) // eslint-disable-line
  const title = company ? t.dayAt(company) : t.dayAs(role)
  if (!go) return <div className="titlecard cold" aria-hidden="true" />
  return (
    <div className="titlecard cold" style={brand ? { '--brand': brand } : undefined} role="img" aria-label={`${title}. ${role}`}>
      <div className="tc-rays" aria-hidden="true" />
      <div className="tc-body">
        {logo ? <div className="tc-logo"><img src={logo} alt="" /></div> : <div className="tc-mark" aria-hidden="true">D1</div>}
        <h2 className="tc-title"><Letters text={title.toUpperCase()} /></h2>
        {company && role && <p className="tc-role">{role}</p>}
        <p className="tc-star">{t.starring}</p>
      </div>
      <div className="tc-flare" aria-hidden="true" />
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
