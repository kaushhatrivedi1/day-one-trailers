import HostLine from './Host.jsx'
import { HOST } from './signs.js'
import { useAccess, useT } from './access.jsx'
import { money } from './i18n.js'

// Turn bare https links in a source line into real links (O*NET's terms require a visible link).
const linkify = (text) => text.split(/(https:\/\/\S+?)(?=[\s)]|$)/).map((part, i) =>
  part.startsWith('https://') ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part)

// Pay as a range: lowest 10%, median, highest 10% on one bar.
function PayRange({ f, lang, t }) {
  const lo = f.low, hi = f.high, span = hi - lo || 1
  const pos = ((f.median - lo) / span) * 100
  return (
    <div className="payrange" aria-label={[t.median(money(f.median, lang)), t.low(money(lo, lang)), t.high(money(hi, lang))].join(' ')}>
      <p className="pay-median">{money(f.median, lang)}<span>/yr</span></p>
      <div className="pay-bar" aria-hidden="true"><span className="pay-fill" /><span className="pay-dot" style={{ left: `${pos}%` }} /></div>
      <div className="pay-ends" aria-hidden="true"><span>{money(lo, lang)}</span><span>{money(hi, lang)}</span></div>
    </div>
  )
}

export default function Credits({ trailer, onAudition, onReplay, onNew }) {
  const t = useT()
  const { lang, sign } = useAccess()
  const c = trailer.credits || {}
  const f = c.figures
  const r = trailer.research
  const company = trailer.company || r?.company || ''
  const brand = r?.brandColor || ''
  const outlook = f ? t.growth(f.growth) : c.outlook
  const source = f ? f.src : c.source
  // t.source wraps the source name in a translated sentence; split it so the name can carry links.
  const [before, after] = t.source('\u0000').split('\u0000')

  return (
    <main className="credits board" style={brand ? { '--brand': brand } : undefined}>
      <header className="board-hero">
        <p className="credits-title">{t.directedBy}</p>
        <h2 className="board-title">
          {r?.logo && <img className="board-logo" src={r.logo} alt="" />}
          <span>{company ? t.dayAt(company) : t.dayAs(trailer.job)}</span>
        </h2>
        {company && <p className="board-role">{trailer.job}</p>}
      </header>

      <div className="board-grid">
        <section className="tile path-tile" style={{ '--d': '.1s' }}>
          <h3 className="tile-h">{t.path}</h3>
          <ol className="stepper">
            {(c.path || []).map((s, k) => <li key={k} style={{ '--k': k }}><span className="node">{k + 1}</span><span className="txt">{s}</span></li>)}
          </ol>
        </section>

        <section className="tile pay-tile" style={{ '--d': '.2s' }}>
          <h3 className="tile-h">{t.pay}</h3>
          {f ? <PayRange f={f} lang={lang} t={t} /> : <p className="tile-text">{c.pay || t.noPay}</p>}
          {outlook && <p className={`outlook ${f && f.growth < 0 ? 'down' : 'up'}`}><span aria-hidden="true">{f && f.growth < 0 ? '↘' : '↗'}</span> {outlook}</p>}
          {c.cost && <><h4 className="tile-sub">{t.cost}</h4><p className="tile-text">{c.cost}</p></>}
          <p className="note">{source ? <>{before}{linkify(source)}{after}</> : t.aiPath}</p>
        </section>

        {r?.summary && (
          <section className="tile co-tile" style={{ '--d': '.3s' }}>
            <h3 className="tile-h">{r.logo && <img className="co-logo" src={r.logo} alt="" />}{t.aboutCo(r.company)}</h3>
            <p className="tile-text">{r.summary}</p>
            {r.mission && <p className="co-mission"><strong>{t.coMission}:</strong> {r.mission}</p>}
            {r.values?.length > 0 && <ul className="chips">{r.values.map((v) => <li key={v}>{v}</li>)}</ul>}
            {r.voices?.length > 0 && (
              <>
                <h4 className="tile-sub">{t.coVoices}</h4>
                <ul className="co-voices">{r.voices.map((v, i) => <li key={i}>{v.theme}{v.from && <span className="note"> ({v.from})</span>}</li>)}</ul>
                <p className="note">{t.coVoicesNote}</p>
              </>
            )}
            {r.sources?.length > 0 && (
              <p className="note">{t.researchedFrom}: {r.sources.map((x, i) => (
                <span key={i}>{i ? ' · ' : ''}<a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></span>
              ))}</p>
            )}
            <p className="note">{t.coUnofficial(r.company)}{r.logoFrom && <> {t.coLogoFrom} <a href={r.logoFrom} target="_blank" rel="noreferrer">{r.logoFrom.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>.</>}</p>
          </section>
        )}

        <section className="tile cta-tile" style={{ '--d': '.4s' }}>
          <HostLine line={HOST.ready(t)} size={200} expr="cheer" pose="cheer" />
          <p className="credits-ask">{t.readyAsk}</p>
          <button className="btn-roll" onClick={onAudition}>{t.startTest}</button>
          <div className="row">
            <button className="btn-ghost" onClick={onReplay}>{t.watchAgain}</button>
            <button className="btn-ghost" onClick={onNew}>{t.anotherJob}</button>
          </div>
        </section>
      </div>

      {sign && (
        <p className="note board-foot">
          Sign language: motion and signs from the American Sign Language Lexicon Video Dataset (ASLLVD), Boston University ASLLRP; Neidle, Thangali &amp; Sclaroff (2012), Neidle et al. (2022).{' '}
          <a href="http://www.bu.edu/asllrp/" target="_blank" rel="noreferrer">bu.edu/asllrp</a> · <a href="http://dai.cs.rutgers.edu/dai/s/signbank" target="_blank" rel="noreferrer">dai.cs.rutgers.edu</a>. Research and education use; sentences are joined from single signs and are not natural ASL grammar.
        </p>
      )}
    </main>
  )
}
